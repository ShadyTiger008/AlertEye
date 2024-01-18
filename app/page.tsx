"use client";
import SocialMediaLinks from "@/components/social-links";
import { ModeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { beep } from "@/utils/audio";
import { Camera, FlipHorizontal, MoonIcon, PersonStanding, SunIcon, Video, Volume2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Rings } from "react-loader-spinner";
import Webcam from "react-webcam";
import { toast } from "sonner";
import * as cococssd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-webgl";
import { clearInterval } from "timers";
import { drawOnCanvas } from "@/utils/draw";

let interval: any = null;
let stopTimeout: any = null;

export default function Home() {
  const webCamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // States
  const [isMirrored, setIsMirrored] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isAutoRecordEnabled, setIsAutoRecordEnabled] = useState<boolean>(false);
  const [volume, setVolume] = useState(0.8);
  const [model, setModel] = useState<cococssd.ObjectDetection>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setIsLoading(true);
    initModel();
  }, []);

  useEffect(() => {
    if (model) {
      setIsLoading(false);
    }
  }, [model]);

  useEffect(() => {
    if (webCamRef && webCamRef.current) {
      const stream = (webCamRef.current.video as any).captureStream();
      if (stream) {
        mediaRecorderRef.current = new MediaRecorder(stream);

        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) {
            const recorderData = new Blob([e.data], { type: "video/webm" });
            const videoUrl = URL.createObjectURL(recorderData);

            const a = document.createElement("a");
            a.href = videoUrl;
            a.download = `${formatDate(new Date())}.webm`;
            a.click();
          }
        };
        mediaRecorderRef.current.onstart = (e) => {
          setIsRecording(true);
        };
        mediaRecorderRef.current.onstop = (e) => {
          setIsRecording(false);
        };
      }
    }
  }, [webCamRef]);

  const formatDate = (d: Date) => {
    const formattedDate =
      [
        (d.getMonth() + 1).toString().padStart(2, "0"),
        d.getDate().toString().padStart(2, "0"),
        d.getFullYear(),
      ]
        .join("-") +
      " " +
      [
        d.getHours().toString().padStart(2, "0"),
        d.getMinutes().toString().padStart(2, "0"),
        d.getSeconds().toString().padStart(2, "0"),
      ].join(":");
    return formattedDate;
  };

  async function runPrediction() {
    if (
      model &&
      webCamRef.current &&
      webCamRef.current.video &&
      (webCamRef.current.video as any).readyState === 4
    ) {
      const predictions: cococssd.DetectedObject[] = await model.detect(
        webCamRef.current.video
      );

      resizeCanvas(canvasRef, webCamRef);
      drawOnCanvas(
        isMirrored,
        predictions,
        canvasRef.current?.getContext("2d")
      );

      let isPerson: boolean = false;
      if (predictions.length > 0) {
        predictions.forEach((prediction) => {
          isPerson = prediction.class === "person";
        });

        if (isPerson && isAutoRecordEnabled && !isRecording) {
          startRecording(true);
        }
      }
    }
  }

  useEffect(() => {
    interval = setInterval(() => {
      runPrediction();
    }, 100);

    return () => {
      // clearInterval(interval);
      clearTimeout(stopTimeout);
    };
  }, [webCamRef.current, model, isMirrored, isAutoRecordEnabled, isRecording, runPrediction]);

  async function initModel() {
    const loadedModel: cococssd.ObjectDetection = await cococssd.load({
      base: "mobilenet_v2",
    });
    setModel(loadedModel);
  }

  // Functions
  const userPromptScreenshot = () => {
    if (!webCamRef.current) {
      toast("Webcam cannot be detected! Please refresh ...")
    }
    const screeshotSrc = webCamRef.current?.getScreenshot();

    const blob = base64toBlob(screeshotSrc);

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a");
    a.href = url;
    a.download = `${formatDate(new Date())}.png`
    a.click();
  };

  const userPromptRecord = () => {
    if (!webCamRef.current) {
      toast("No webcam detected. Please refresh");
    }

    if (mediaRecorderRef.current?.state == "recording") {
      mediaRecorderRef.current.requestData();
      clearTimeout(stopTimeout);
      mediaRecorderRef.current.stop();
      toast("Recording saved successfully to downloads folder");
    } else {
      startRecording(false);
    }
  };

  function startRecording(doBeep: boolean) {
    if (webCamRef.current && mediaRecorderRef.current?.state !== "recording") {
      mediaRecorderRef.current?.start();
      setIsRecording(true);
      doBeep && beep(volume);
    }

    stopTimeout = setTimeout(() => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current?.stop();
      }
    }, 30000);
  }

  const toggleAutoRecord = () => {
    setIsAutoRecordEnabled((prev) => !prev);
    toast(`Auto recording is ${isAutoRecordEnabled ? "disabled" : "enabled"}`);
  };

  function resizeCanvas(
      canvasRef: React.RefObject<HTMLCanvasElement>,
      webCamRef: React.RefObject<Webcam>
    ) {
      const video = webCamRef.current?.video;
      const canvas = canvasRef.current;
      if (canvas && video) {
        const { videoWidth, videoHeight } = video;
        canvas.width = videoWidth;
        canvas.height = videoHeight;
      }
  }

  function base64toBlob(base64Data: any) {
    const byteCharacters = atob(base64Data.split(",")[1]);
    const arrayBuffer = new ArrayBuffer(byteCharacters.length);
    const byteArray = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i);
    }

    return new Blob([arrayBuffer], { type: "image/png" }); // Specify the image type here
  }

  //Inner components
  const RenderFeatureHighlightsSection = () => {
    return <div className="text-xs text-muted-foreground">
      <ul className="space-y-4">
        <li>
          <strong>Dark Mode/Sys Theme 🌗</strong>
          <p>Toggle between dark mode and system theme.</p>
          <Button className="my-2 h-6 w-6" variant={"outline"} size={"icon"}>
            <SunIcon size={14} />
          </Button>{" "}
          /{" "}
          <Button className="my-2 h-6 w-6" variant={"outline"} size={"icon"}>
            <MoonIcon size={14} />
          </Button>
        </li>
        <li>
          <strong>Horizontal Flip ↔️</strong>
          <p>Adjust horizontal orientation.</p>
          <Button className='h-6 w-6 my-2'
            variant={'outline'} size={'icon'}
            onClick={() => {
              setIsMirrored((prev) => !prev)
            }}
          ><FlipHorizontal size={14} /></Button>
        </li>
        <Separator />
        <li>
          <strong>Take Pictures 📸</strong>
          <p>Capture snapshots at any moment from the video feed.</p>
          <Button
            className='h-6 w-6 my-2'
            variant={'outline'} size={'icon'}
            onClick={userPromptScreenshot}
          >
            <Camera size={14} />
          </Button>
        </li>
        <li>
          <strong>Manual Video Recording 📽️</strong>
          <p>Manually record video clips as needed.</p>
          <Button className='h-6 w-6 my-2'
            variant={isRecording ? 'destructive' : 'outline'} size={'icon'}
            onClick={userPromptRecord}
          >
            <Video size={14} />
          </Button>
        </li>
        <Separator />
        <li>
          <strong>Enable/Disable Auto Record 🚫</strong>
          <p>
            Option to enable/disable automatic video recording whenever
            required.
          </p>
          <Button className='h-6 w-6 my-2'
            variant={isAutoRecordEnabled ? 'destructive' : 'outline'}
            size={'icon'}
            onClick={toggleAutoRecord}
          >
            {isAutoRecordEnabled ? <Rings color='white' height={30} /> : <PersonStanding size={14} />}

          </Button>
        </li>

        <li>
          <strong>Volume Slider 🔊</strong>
          <p>Adjust the volume level of the notifications.</p>
        </li>
        <li>
          <strong>Camera Feed Highlighting 🎨</strong>
          <p>
            Highlights persons in{" "}
            <span style={{ color: "#FF0F0F" }}>red</span> and other objects in{" "}
            <span style={{ color: "#00B612" }}>green</span>.
          </p>
        </li>
        <Separator />
        <li className="space-y-4">
          <strong>Share your thoughts 💬 </strong>
          <SocialMediaLinks/>
          <br />
          <br />
          <br />
        </li>
      </ul>
    </div>
  }

  return (
    <main className="flex h-screen">
      {/* Left division - webcam and canvas */}
      <div className="relative">
        <div className="relative h-screen w-full">
          <Webcam ref={webCamRef} mirrored={isMirrored} className='h-full w-full  object-contain p-2' />
          <canvas ref={canvasRef} className='absolute top-0 left-0  h-full w-full object-contain' />
        </div>
      </div>
      
      {/* Right division - webcam and canvas */}
      <div className="flex flex-row flex-1">
        <div className="border-primary/5 border-2 max-w-xs flex flex-col gap-2 justify-between shadow-md rounded-md p-4">
          {/* top section */}
          <div className="flex flex-col gap-2">
            <ModeToggle />
            <Button variant='outline' size='icon' onClick={() => setIsMirrored(prev => !prev)}>
              <FlipHorizontal/>
            </Button>
            <Separator className='my-2'/>
          </div>

          {/* middle section */}
          <div className="flex flex-col gap-2">
            <Separator className='my-2'/>
            <Button variant='outline' size='icon' onClick={userPromptScreenshot}>
              <Camera/>
            </Button>
            <Button variant={`${isRecording ? "destructive" : "outline"}`} size='icon' onClick={userPromptRecord}>
              <Video />
            </Button>
            <Separator className='my-2' />
            <Button variant={`${isAutoRecordEnabled ? "destructive" : "outline"}`} size="icon" onClick={toggleAutoRecord}>
              {isAutoRecordEnabled ? <Rings color='white' height={45} /> : <PersonStanding/>}
            </Button>
          </div>

          {/* bottom section */}
          <div className="flex flex-col gap-2"></div>
          <Separator className='my-2' />
          <Popover asChild>
            <PopoverTrigger>
              <Button variant='outline' size='icon'>
                <Volume2/>
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <Slider max={1} min={0} step={0.2} defaultValue={[volume]} onValueCommit={(val) => { setVolume(val[0]); beep(val[0])}}/>
            </PopoverContent>
          </Popover>
        </div>
        <div className='h-full flex-1 py-4 px-2 overscroll-y-scroll'>
          <RenderFeatureHighlightsSection/>
        </div>
      </div>
      {isLoading && <div className='z-50 absolute w-full h-full flex items-center justify-center bg-primary-foreground'>
        Getting things ready. . . <Rings height={50} color='red' />
      </div>}
    </main>
  )
}
