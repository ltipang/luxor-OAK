import argparse
import threading
import time, datetime
from pathlib import Path

import cv2
import depthai as dai
import numpy as np
import os, requests

__location__ = os.path.realpath(os.path.join(os.getcwd(), os.path.dirname(__file__)))
car_names = []
car_names_path = os.path.join(__location__, 'models/label_model.txt')
with open(car_names_path, "r", encoding="utf-8") as infile:
    for line in infile:
        ltxt = line.strip()
        car_names.append(ltxt)
infile.close()

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
lpr_img_folder = 'lpr_images/{}'.format(str(datetime.datetime.now()).split('.')[0].replace(':', '-'))
if not os.path.isdir(lpr_img_folder): os.makedirs(lpr_img_folder)

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
    det_nn.setConfidenceThreshold(0.1)	
    det_nn.input.setQueueSize(1)
    det_nn.setBlobPath(str(Path("models/detect.blob").resolve().absolute()))
    det_nn.input.setBlocking(False)
    
    det_nn_xout = pipeline.createXLinkOut()
    det_nn_xout.setStreamName("det_nn")
    det_nn.out.link(det_nn_xout.input)
    det_pass = pipeline.createXLinkOut()
    det_pass.setStreamName("det_pass")
    det_nn.passthrough.link(det_pass.input)

    if args.camera:
        manip = pipeline.createImageManip()
        manip.initialConfig.setResize(416, 416)
        manip.initialConfig.setFrameType(dai.RawImgFrame.Type.BGR888p)
        cam.preview.link(manip.inputImage)
        manip.out.link(det_nn.input)
    else:
        det_xin = pipeline.createXLinkIn()
        det_xin.setStreamName("det_in")
        det_xin.out.link(det_nn.input)

    rec_nn = pipeline.createYoloDetectionNetwork()
    rec_nn.setNumClasses(36)
    rec_nn.setCoordinateSize(4)
    rec_nn.setAnchors(np.array([10, 14, 23, 27, 37, 58, 81, 82, 135, 169, 344, 319]))
    rec_nn.setAnchorMasks({"side26": np.array([1, 2, 3]), "side13": np.array([3, 4, 5])})
    rec_nn.setIouThreshold(0.5)
    rec_nn.setConfidenceThreshold(0.01)
    rec_nn.setBlobPath(str(Path("models/recog.blob").resolve().absolute()))
    rec_nn.input.setQueueSize(1)
    rec_nn.setNumInferenceThreads(2)
    rec_nn.input.setBlocking(False)
	
    rec_xout = pipeline.createXLinkOut()
    rec_xout.setStreamName("rec_nn")
    rec_nn.out.link(rec_xout.input)
    rec_pass = pipeline.createXLinkOut()
    rec_pass.setStreamName("rec_pass")
    rec_nn.passthrough.link(rec_pass.input)
    rec_xin = pipeline.createXLinkIn()
    rec_xin.setStreamName("rec_in")
    rec_xin.out.link(rec_nn.input)
    
    # NeuralNetwork
    print("Creating Vehicle Detection Neural Network...")
    veh_nn = pipeline.createMobileNetDetectionNetwork()
    veh_nn.setConfidenceThreshold(0.5)
    veh_nn.setBlobPath(str(Path("models/vehicle-detection-adas-0002.blob").resolve().absolute()))
    veh_nn.input.setQueueSize(1)
    veh_nn.input.setBlocking(False)
    veh_nn_xout = pipeline.createXLinkOut()
    veh_nn_xout.setStreamName("veh_nn")
    veh_nn.out.link(veh_nn_xout.input)
    veh_pass = pipeline.createXLinkOut()
    veh_pass.setStreamName("veh_pass")
    veh_nn.passthrough.link(veh_pass.input)

    if args.camera:
        #manip_v = pipeline.createImageManip()
        #manip_v.initialConfig.setResize(672, 384)
        #manip_v.initialConfig.setFrameType(dai.RawImgFrame.Type.BGR888p)
        #cam.preview.link(manip_v.inputImage)
        #manip_v.out.link(veh_nn.input)
        cam.preview.link(veh_nn.input)
    else:
        veh_xin = pipeline.createXLinkIn()
        veh_xin.setStreamName("veh_in")
        veh_xin.out.link(veh_nn.input)

    attr_nn = pipeline.createNeuralNetwork()
    attr_nn.setBlobPath(str(Path('models/car_model.blob').resolve().absolute()))
    attr_nn.input.setBlocking(False)
    attr_nn.setNumInferenceThreads(2)
    attr_nn.input.setQueueSize(1)
    attr_xout = pipeline.createXLinkOut()
    attr_xout.setStreamName("attr_nn")
    attr_nn.out.link(attr_xout.input)
    attr_pass = pipeline.createXLinkOut()
    attr_pass.setStreamName("attr_pass")
    attr_nn.passthrough.link(attr_pass.input)
    attr_xin = pipeline.createXLinkIn()
    attr_xin.setStreamName("attr_in")
    attr_xin.out.link(attr_nn.input)

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


# whole detection tracking params
running = True
license_detections = []
vehicle_detections = []
lpr_det_results = {}
rec_results = {}
veh_det_results = {}
attr_results = {}
show_results_len = 4
show_results = []

frame_det_seq = 0
frame_seq_map = {}
lic_last_seq = 0
veh_last_seq = 0
frames_delay = 100

# LPR tracking params
lpr_post_url = 'http://157.245.214.97:5000/bk/lpr'
buffer = {}
same_number_duration = 10 * 60  # 10 mins
#debug = False
upload_data = None

if args.camera:
    fps = FPSHandler()
else:
    cap = cv2.VideoCapture(str(Path(args.video).resolve().absolute()))
    fps = FPSHandler(cap)


def lic_thread(det_queue, det_pass, rec_queue):
    global license_detections, lic_last_seq, lpr_det_results

    while running:
        try:
            in_det = det_queue.get().detections
            in_pass = det_pass.get()
            SequenceNum = in_pass.getSequenceNum()

            orig_frame = frame_seq_map.get(SequenceNum, None)
            if orig_frame is None:
                continue

            license_detections = []
            lic_last_seq = SequenceNum - frames_delay
            tstamp = in_pass.getTimestamp()

            max_bbox, max_area = None, -1
            for detection in in_det:
                bbox = frame_norm(orig_frame, (detection.xmin, detection.ymin, detection.xmax, detection.ymax))
                license_detections.append(bbox)
                area = (bbox[3] - bbox[1]) * (bbox[2] - bbox[0])
                if max_area < area: max_bbox, max_area = bbox, area
            lpr_det_results[SequenceNum] = max_bbox
            cropped_frame = orig_frame[max_bbox[1]:max_bbox[3], max_bbox[0]:max_bbox[2]]
            img = dai.ImgFrame()
            img.setTimestamp(tstamp)
            img.setSequenceNum(SequenceNum)
            img.setType(dai.RawImgFrame.Type.BGR888p)
            img.setData(to_planar(cropped_frame, (416, 416)))
            img.setWidth(416)
            img.setHeight(416)
            rec_queue.send(img)

            fps.tick('lic')
        except RuntimeError:
            continue
			
items = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "I",
         "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]
		 
def rec_thread(q_rec, q_pass):
    def detect_numer(x_pos, y_pos, labels):
        number = ''
        for ind in np.argsort(x_pos):
            number += labels[ind]
        return number
    
    global rec_results

    while running:
        try:
            rec_data = q_rec.get().detections
            rec_frame = q_pass.get().getCvFrame()
            timestamp = q_pass.get().getTimestamp()
            SequenceNum = q_pass.get().getSequenceNum()
        except RuntimeError:
            continue
        decoded_text, decoded_prob = "", 0
        x_pos, y_pos, labels = [], [], []
        for rec in rec_data:
            if rec.label < 0:
                break
            #x_pos.append((rec.xmin + rec.xmax) / 2)
            x_pos.append(rec.xmin)
            #y_pos.append(rec.ymin)
            #x_pos.append((rec.ymin + rec.ymax) / 2)
            labels.append(items[int(rec.label)])
            decoded_prob += rec.confidence
        # simple rule
        if len(labels) < 1: continue
        decoded_text = detect_numer(x_pos, y_pos, labels)
        rec_results[SequenceNum] = (cv2.resize(rec_frame, (224, 64)), decoded_text, decoded_prob / len(labels), timestamp)
        fps.tick('rec')


def veh_thread(det_queue, det_pass, attr_queue):
    global vehicle_detections, veh_last_seq, veh_det_results

    while running:
        try:
            dets = det_queue.get().detections
            in_pass = det_pass.get()
            SequenceNum = in_pass.getSequenceNum()

            orig_frame = frame_seq_map.get(SequenceNum, None)
            if orig_frame is None:
                continue
                
            veh_last_seq = SequenceNum - frames_delay
            tstamp = in_pass.getTimestamp()
            vehicle_detections = []

            max_bbox, max_area = None, -1
            for detection in dets:
                bbox = frame_norm(orig_frame, (detection.xmin, detection.ymin, detection.xmax, detection.ymax))
                vehicle_detections.append(bbox)
                area = (bbox[3] - bbox[1]) * (bbox[2] - bbox[0])
                if max_area < area: max_bbox, max_area = bbox, area
            veh_det_results[SequenceNum] = max_bbox
            cropped_frame = orig_frame[max_bbox[1]:max_bbox[3], max_bbox[0]:max_bbox[2]]
            img = dai.ImgFrame()
            img.setTimestamp(tstamp)
            img.setSequenceNum(SequenceNum)
            img.setType(dai.RawImgFrame.Type.BGR888p)
            img.setData(to_planar(cropped_frame, (224, 224)))
            img.setWidth(224)
            img.setHeight(224)
            attr_queue.send(img)

            fps.tick('veh')
        except RuntimeError:
            continue

def attr_thread(q_attr, q_pass):
    global attr_results

    while running:
        try:
            attr_data = q_attr.get()
            attr_frame = q_pass.get().getCvFrame()
            timestamp = q_pass.get().getTimestamp()
            SequenceNum = q_pass.get().getSequenceNum()
        except RuntimeError:
            continue

        colors = ["white", "gray", "yellow", "red", "green", "blue", "black"]
        types = ["car", "bus", "truck", "van"]

        in_color = np.array(attr_data.getLayerFp16("prob"))

        color = car_names[in_color.argmax()]
        color_prob = float(in_color.max())
        type = types[1]
        type_prob = float(0.9)

        attr_results[SequenceNum] = (attr_frame, color, type, color_prob, type_prob, timestamp)
        fps.tick('attr')

def upload_thread():
    global upload_data
    while running:
        if upload_data is not None:
            try:
                upload_data = {'model': attr_color, 'model_prob': color_prob, 'plate_number': rec_text, 'plate_prob': decoded_prob, 'log_file': os.path.abspath(img_path)}
                r = requests.post(lpr_post_url, data=upload_data)
                print('uploaded lpr data into server.')
            except:
                print("can't upload lpr data into server.")
            upload_data = None
        time.sleep(1)

	
with dai.Device(create_pipeline()) as device:
    print("Starting pipeline...")
    device.startPipeline()
    if args.camera:
        cam_out = device.getOutputQueue("cam_out", 1, True)
    else:
        det_in = device.getInputQueue("det_in")
        veh_in = device.getInputQueue("veh_in")
    # LPR    
    det_nn = device.getOutputQueue("det_nn", 1, False)
    det_pass = device.getOutputQueue("det_pass", 1, False)
    rec_in = device.getInputQueue("rec_in")    
    rec_nn = device.getOutputQueue("rec_nn", 1, False)
    rec_pass = device.getOutputQueue("rec_pass", 1, False)    
    # Vehicle detection
    veh_nn = device.getOutputQueue("veh_nn", 1, False)
    veh_pass = device.getOutputQueue("veh_pass", 1, False)
    attr_in = device.getInputQueue("attr_in")
    attr_nn = device.getOutputQueue("attr_nn", 1, False)
    attr_pass = device.getOutputQueue("attr_pass", 1, False)

    # LPR Threading
    det_t = threading.Thread(target=lic_thread, args=(det_nn, det_pass, rec_in))
    det_t.start()
    rec_t = threading.Thread(target=rec_thread, args=(rec_nn, rec_pass))
    rec_t.start()
    # Vehicle detection Threading
    veh_t = threading.Thread(target=veh_thread, args=(veh_nn, veh_pass, attr_in))
    veh_t.start()
    attr_t = threading.Thread(target=attr_thread, args=(attr_nn, attr_pass))
    attr_t.start()
    # upload lpr data
    upload_t = threading.Thread(target=upload_thread, args=())
    upload_t.start()

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
            try:
                in_rgb = cam_out.get()
                frame = in_rgb.getCvFrame()
                frame_seq_map[in_rgb.getSequenceNum()] = frame
            except:
                frame = None
            return True, frame


    try:
        while should_run():
            read_correctly, frame = get_frame()

            if not read_correctly: break
            if frame is None: print('issue in camera streaming.');continue
                
            for map_key in list(filter(lambda item: item <= min(lic_last_seq, veh_last_seq), frame_seq_map.keys())):
                del frame_seq_map[map_key]
            for map_key in list(filter(lambda item: item <= min(lic_last_seq, veh_last_seq), veh_det_results.keys())):
                del veh_det_results[map_key]
            for map_key in list(filter(lambda item: item <= min(lic_last_seq, veh_last_seq), lpr_det_results.keys())):
                del lpr_det_results[map_key]
            for map_key in list(filter(lambda item: item <= min(lic_last_seq, veh_last_seq), rec_results.keys())):
                del rec_results[map_key]
            for map_key in list(filter(lambda item: item <= min(lic_last_seq, veh_last_seq), attr_results.keys())):
                del attr_results[map_key]

            fps.next_iter()

            if not args.camera:
                tstamp = time.monotonic()
                # LPR
                lic_frame = dai.ImgFrame()
                lic_frame.setData(to_planar(frame, (416, 416)))
                lic_frame.setTimestamp(tstamp)
                lic_frame.setSequenceNum(frame_det_seq)
                lic_frame.setType(dai.RawImgFrame.Type.BGR888p)
                lic_frame.setWidth(416)
                lic_frame.setHeight(416)
                # Vehicle detection
                veh_frame = dai.ImgFrame()
                veh_frame.setData(to_planar(frame, (672, 384)))
                veh_frame.setTimestamp(tstamp)
                veh_frame.setSequenceNum(frame_det_seq)
                veh_frame.setType(dai.RawImgFrame.Type.BGR888p)
                veh_frame.setWidth(672)
                veh_frame.setHeight(384)
                # send images
                det_in.send(lic_frame)
                veh_in.send(veh_frame)

            # arrangements
            #print(list(veh_det_results.keys()))
            #print(list(lpr_det_results.keys()))
            #print(list(rec_results.keys()))
            #print(list(attr_results.keys()))
            #print()
            rec_keys = list(rec_results.keys())
            attr_keys = list(attr_results.keys())
            for SequenceNum in rec_keys:
                if SequenceNum not in attr_keys:
                    found = False
                    for SequenceNum2 in attr_keys:
                        if SequenceNum2 > SequenceNum: break
                        if SequenceNum - SequenceNum2 == 1: found = True; break
                    if not found: continue
                else: SequenceNum2 = SequenceNum
                veh_bbox, lp_bbox = veh_det_results.pop(SequenceNum2), lpr_det_results.pop(SequenceNum)
                rec_img, rec_text, decoded_prob, rec_timestamp = rec_results.pop(SequenceNum)
                #rec_timestamp = str(datetime.datetime.fromtimestamp(rec_timestamp))
                attr_img, attr_color, attr_type, color_prob, type_prob, attr_timestamp = attr_results.pop(SequenceNum2)
                if lp_bbox[2] < veh_bbox[0] or lp_bbox[0] > veh_bbox[2] or lp_bbox[3] < veh_bbox[1] or lp_bbox[1] > veh_bbox[3]: continue
                orig_frame_ = frame_seq_map.get(SequenceNum, None)
                if orig_frame_ is None: continue
                if rec_text in buffer:
                    past_timestamp = buffer[rec_text]
                    if (rec_timestamp - past_timestamp).seconds < same_number_duration: continue
                print('detected ' + rec_text)
                buffer[rec_text] = rec_timestamp
                orig_frame = orig_frame_.copy()
                cv2.rectangle(orig_frame, (lp_bbox[0], lp_bbox[1]), (lp_bbox[2], lp_bbox[3]), (255, 0, 0), 2)
                cv2.rectangle(orig_frame, (veh_bbox[0], veh_bbox[1]), (veh_bbox[2], veh_bbox[3]), (0, 0, 255), 2)
                cv2.putText(orig_frame, f"{rec_text} ({int(decoded_prob * 100)} %)", (15, 25), cv2.FONT_HERSHEY_TRIPLEX, 0.5, (0, 255, 0))
                cv2.putText(orig_frame, attr_color, (15, 45), cv2.FONT_HERSHEY_TRIPLEX, 0.5, (0, 255, 0))
                cv2.putText(orig_frame, f"{int(color_prob * 100)} %", (15, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0))
                cv2.putText(orig_frame, f"{rec_timestamp}", (15, 85), cv2.FONT_HERSHEY_TRIPLEX, 0.5, (0, 255, 0))
                img_path = lpr_img_folder + '/%09d_%s.jpg' % (SequenceNum, rec_text)
                cv2.imwrite(img_path, orig_frame)
                upload_data = {'model': attr_color, 'model_prob': color_prob, 'plate_number': rec_text, 'plate_prob': decoded_prob, 'log_file': os.path.abspath(img_path)}
                if not debug: continue # show
                attr_placeholder_img = np.zeros((224, 400, 3), np.uint8)
                attr_placeholder_img[:rec_img.shape[0], :rec_img.shape[1], :] = rec_img
                cv2.putText(attr_placeholder_img, rec_text, (15, 100), cv2.FONT_HERSHEY_TRIPLEX, 0.5, (0, 255, 0))
                cv2.putText(attr_placeholder_img, attr_color, (15, 120), cv2.FONT_HERSHEY_TRIPLEX, 0.5, (0, 255, 0))
                cv2.putText(attr_placeholder_img, f"{int(color_prob * 100)}%", (15, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0))
                cv2.putText(attr_placeholder_img, f"{rec_timestamp}", (15, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0))
                attr_combined = np.hstack((attr_img, attr_placeholder_img))
                show_results = [attr_combined] + show_results[:show_results_len-1]

            if debug:		
                debug_frame = frame.copy()
                for bbox in license_detections:
                    cv2.rectangle(debug_frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (255, 0, 0), 2)
                if len(license_detections) > 0: print('license detected.')
                for bbox in vehicle_detections:
                    cv2.rectangle(debug_frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 0, 255), 2)
                if len(vehicle_detections) > 0: print('vehicle detected.')
                cv2.putText(debug_frame, f"RGB FPS: {round(fps.fps(), 1)}", (5, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                            (0, 255, 0))
                cv2.putText(debug_frame, f"LIC(detect) FPS:  {round(fps.tick_fps('lic'), 1)}", (5, 30), cv2.FONT_HERSHEY_SIMPLEX,
                            0.5, (0, 255, 0))
                cv2.putText(debug_frame, f"LIC(recog) FPS:  {round(fps.tick_fps('rec'), 1)}", (5, 45), cv2.FONT_HERSHEY_SIMPLEX,
                            0.5, (0, 255, 0))
                cv2.putText(debug_frame, f"VEH(detect) FPS:  {round(fps.tick_fps('veh'), 1)}", (5, 60), cv2.FONT_HERSHEY_SIMPLEX,
                            0.5, (0, 255, 0))
                cv2.putText(debug_frame, f"VEH(classify) FPS:  {round(fps.tick_fps('attr'), 1)}", (5, 75), cv2.FONT_HERSHEY_SIMPLEX,
                            0.5, (0, 255, 0))
                cv2.imshow("rgb", debug_frame)

                # Show Results
                rec_stacked = None
                for show_result in show_results:
                    if rec_stacked is None:
                        rec_stacked = show_result
                    else:
                        rec_stacked = np.vstack((rec_stacked, show_result))
                if rec_stacked is not None:
                    cv2.imshow("Recognized car & plates", rec_stacked)

            key = cv2.waitKey(10)
            if key == ord('q'):
                break

    except KeyboardInterrupt:
        pass

    running = False

det_t.join()
rec_t.join()
veh_t.join()
attr_t.join()
upload_t.join()

print("FPS: {:.2f}".format(fps.fps()))
if not args.camera:
    cap.release()