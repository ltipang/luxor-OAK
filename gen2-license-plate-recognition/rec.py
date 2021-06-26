import argparse
import threading
import time
from pathlib import Path

import cv2
import depthai as dai
import numpy as np
import os

def create_pipeline():
    print("Creating pipeline...")
    pipeline = dai.Pipeline()
    
    print("Creating Color Camera...")
    cam = pipeline.createColorCamera()
    cam.setPreviewSize(672, 384)
    cam.setResolution(dai.ColorCameraProperties.SensorResolution.THE_1080_P)
    cam.setInterleaved(False)
    cam.setBoardSocket(dai.CameraBoardSocket.RGB)
    cam_xout = pipeline.createXLinkOut()
    cam_xout.setStreamName("cam_out")
    cam.video.link(cam_xout.input)

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

fps = FPSHandler()

# video recorder
fourcc = cv2.VideoWriter_fourcc(*'XVID')  # cv2.VideoWriter_fourcc() does not exist
video_writer = cv2.VideoWriter("output.avi", fourcc, 5, (1920, 1080))


with dai.Device(create_pipeline()) as device:
    print("Starting pipeline...")
    device.startPipeline()
    cam_out = device.getOutputQueue("cam_out", 1, True) 

    try:
        frame_num = 0
        while True:
            frame_num += 1
           
            fps.next_iter()
            in_rgb = cam_out.get()
            frame = in_rgb.getCvFrame()
            
            video_writer.write(frame)   
            cv2.imshow("rgb", frame)
            key = cv2.waitKey(1)
            if key == ord('q'):
                break

    except KeyboardInterrupt:
        pass

    running = False

video_writer.release()

print("FPS: {:.2f}".format(fps.fps()))
