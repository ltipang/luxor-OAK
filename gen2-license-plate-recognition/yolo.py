import argparse
import threading
import time
from pathlib import Path

import cv2
import depthai as dai
import numpy as np
import os

__location__ = os.path.realpath(os.path.join(os.getcwd(), os.path.dirname(__file__)))

parser = argparse.ArgumentParser()
parser.add_argument('-nd', '--no-debug', action="store_true", help="Prevent debug output")
parser.add_argument('-cam', '--camera', action="store_true",
                    help="Use DepthAI 4K RGB camera for inference (conflicts with -vid)")
parser.add_argument('-vid', '--video', type=str,
                    help="Path to video file to be used for inference (conflicts with -cam)")
args = parser.parse_args()

if not args.camera and not args.video:
    raise RuntimeError(
        "No source selected. Use either \"-cam\" to run on RGB camera as a source or \"-vid <path>\" to run on video"
    )

debug = not args.no_debug


def cos_dist(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


def to_tensor_result(packet):
    return {
        tensor.name: np.array(packet.getLayerFp16(tensor.name)).reshape(tensor.dims)
        for tensor in packet.getRaw().tensors
    }


def frame_norm(frame, bbox):
    return (np.clip(np.array(bbox), 0, 1) * np.array([*frame.shape[:2], *frame.shape[:2]])[::-1]).astype(int)


def to_planar(arr: np.ndarray, shape: tuple) -> list:
    return cv2.resize(arr, shape).transpose(2, 0, 1).flatten()


def create_pipeline():
    print("Creating pipeline...")
    pipeline = dai.Pipeline()
    pipeline.setOpenVINOVersion(dai.OpenVINO.Version.VERSION_2020_1)

    if args.camera:
        print("Creating Color Camera...")
        cam = pipeline.createColorCamera()
        cam.setPreviewSize(672, 384)
        cam.setResolution(dai.ColorCameraProperties.SensorResolution.THE_1080_P)
        cam.setInterleaved(False)
        cam.setBoardSocket(dai.CameraBoardSocket.RGB)
        cam_xout = pipeline.createXLinkOut()
        cam_xout.setStreamName("cam_out")
        cam.preview.link(cam_xout.input)

    # NeuralNetwork
    print("Creating License Plates Detection Neural Network...")
    det_nn = pipeline.createYoloDetectionNetwork()
    det_nn.setNumClasses(1)
    det_nn.setCoordinateSize(4)
    det_nn.setAnchors(np.array([10, 14, 23, 27, 37, 58, 81, 82, 135, 169, 344, 319]))
    det_nn.setAnchorMasks({"side26": np.array([1, 2, 3]), "side13": np.array([3, 4, 5])})
    det_nn.setIouThreshold(0.5)
    det_nn.setBlobPath(str(Path("models/detect.blob").resolve().absolute()))
    det_nn.setNumInferenceThreads(2)
    det_nn.input.setBlocking(False)
    
    det_nn_xout = pipeline.createXLinkOut()
    det_nn_xout.setStreamName("det_nn")
    det_nn.out.link(det_nn_xout.input)
    det_pass = pipeline.createXLinkOut()
    det_pass.setStreamName("det_pass")
    det_nn.passthrough.link(det_pass.input)

    if args.camera:
        manip = pipeline.createImageManip()
        manip.initialConfig.setResize(224, 224)
        manip.initialConfig.setFrameType(dai.RawImgFrame.Type.BGR888p)
        cam.preview.link(manip.inputImage)
        manip.out.link(det_nn.input)
    else:
        det_xin = pipeline.createXLinkIn()
        det_xin.setStreamName("det_in")
        det_xin.out.link(det_nn.input)


    
    print("Pipeline created.")
    return pipeline


class FPSHandler:
    def __init__(self, cap=None):
        self.timestamp = time.time()
        self.start = time.time()
        self.framerate = cap.get(cv2.CAP_PROP_FPS) if cap is not None else None

        self.frame_cnt = 0
        self.ticks = {}
        self.ticks_cnt = {}

    def next_iter(self):
        if not args.camera:
            frame_delay = 1.0 / self.framerate
            delay = (self.timestamp + frame_delay) - time.time()
            if delay > 0:
                time.sleep(delay)
        self.timestamp = time.time()
        self.frame_cnt += 1

    def tick(self, name):
        if name in self.ticks:
            self.ticks_cnt[name] += 1
        else:
            self.ticks[name] = time.time()
            self.ticks_cnt[name] = 0

    def tick_fps(self, name):
        if name in self.ticks:
            return self.ticks_cnt[name] / (time.time() - self.ticks[name])
        else:
            return 0

    def fps(self):
        return self.frame_cnt / (self.timestamp - self.start)


running = True
license_detections = []
rec_results = []

frame_det_seq = 0
frame_seq_map = {}
lic_last_seq = 0

if args.camera:
    fps = FPSHandler()
else:
    cap = cv2.VideoCapture(str(Path(args.video).resolve().absolute()))
    fps = FPSHandler(cap)


def lic_thread(det_queue, det_pass):
    global license_detections, lic_last_seq

    while running:
        try:
            in_det = det_queue.get().detections
            in_pass = det_pass.get()

            orig_frame = frame_seq_map.get(in_pass.getSequenceNum(), None)
            if orig_frame is None:
                continue

            license_detections = in_det

            for detection in license_detections:
                bbox = frame_norm(orig_frame, (detection.xmin, detection.ymin, detection.xmax, detection.ymax))
                cropped_frame = orig_frame[bbox[1]:bbox[3], bbox[0]:bbox[2]]
                print(detection)

                tstamp = time.monotonic()
                img = dai.ImgFrame()
                img.setTimestamp(tstamp)
                img.setType(dai.RawImgFrame.Type.BGR888p)
                img.setData(to_planar(cropped_frame, (94, 24)))
                img.setWidth(94)
                img.setHeight(24)

            fps.tick('lic')
        except RuntimeError:
            continue


with dai.Device(create_pipeline()) as device:
    print("Starting pipeline...")
    device.startPipeline()
    if args.camera:
        cam_out = device.getOutputQueue("cam_out", 1, True)
    else:
        det_in = device.getInputQueue("det_in")
        
    
    det_nn = device.getOutputQueue("det_nn", 1, False)
    det_pass = device.getOutputQueue("det_pass", 1, False)
    

    det_t = threading.Thread(target=lic_thread, args=(det_nn, det_pass))
    det_t.start()
    


    def should_run():
        return cap.isOpened() if args.video else True


    def get_frame():
        global frame_det_seq

        if args.video:
            read_correctly, frame = cap.read()
            if read_correctly:
                frame_seq_map[frame_det_seq] = frame
                frame_det_seq += 1
            return read_correctly, frame
        else:
            in_rgb = cam_out.get()
            frame = in_rgb.getCvFrame()
            frame_seq_map[in_rgb.getSequenceNum()] = frame

            return True, frame


    try:
        while should_run():
            read_correctly, frame = get_frame()

            if not read_correctly:
                break
                
            for map_key in list(filter(lambda item: item <= min(lic_last_seq, lic_last_seq), frame_seq_map.keys())):
                del frame_seq_map[map_key]

            fps.next_iter()

            if not args.camera:
                tstamp = time.monotonic()
                lic_frame = dai.ImgFrame()
                lic_frame.setData(to_planar(frame, (416, 416)))
                lic_frame.setTimestamp(tstamp)
                lic_frame.setSequenceNum(frame_det_seq)
                lic_frame.setType(dai.RawImgFrame.Type.BGR888p)
                lic_frame.setWidth(416)
                lic_frame.setHeight(416)
                det_in.send(lic_frame)
                

            if debug:
                debug_frame = frame.copy()
                for detection in license_detections:
                    bbox = frame_norm(debug_frame, (detection.xmin, detection.ymin, detection.xmax, detection.ymax))
                    cv2.rectangle(debug_frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (255, 0, 0), 2)
                cv2.putText(debug_frame, f"RGB FPS: {round(fps.fps(), 1)}", (5, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                            (0, 255, 0))
                cv2.putText(debug_frame, f"LIC FPS:  {round(fps.tick_fps('lic'), 1)}", (5, 30), cv2.FONT_HERSHEY_SIMPLEX,
                            0.5, (0, 255, 0))
                cv2.imshow("rgb", debug_frame)
  

            key = cv2.waitKey(1)
            if key == ord('q'):
                break

    except KeyboardInterrupt:
        pass

    running = False

det_t.join()

print("FPS: {:.2f}".format(fps.fps()))
if not args.camera:
    cap.release()