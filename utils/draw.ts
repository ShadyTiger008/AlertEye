import { DetectedObject } from "@tensorflow-models/coco-ssd";

export function drawOnCanvas(isMirrored: boolean, predictions: DetectedObject[], context: CanvasRenderingContext2D | null | undefined) {
    predictions.forEach((detectedObject: DetectedObject) => {
        const { class: objectName, bbox, score } = detectedObject;
        const [x, y, width, height] = bbox;

        if (context) {
            context.beginPath();

            //Styling
            context.fillStyle = objectName === "person" ? "#FF0F0F" : "00B612";
            context.globalAlpha = 0.4;

            isMirrored ? context.roundRect(context.canvas.width - x, y - context.canvas.height, width, height, 8) : context.roundRect(x, y, width, height, 8);

            //Draw stroke or fill
            context.fill()

            //Text styling
            context.font = "12px Courier New";
            context.fillStyle = 'black'
            context.globalAlpha = 1

            isMirrored ? context.fillText(objectName, context.canvas.width - x - width + 10, y + 20) : context.fillText(objectName, x + 10, y + 20)

        }
    })
}