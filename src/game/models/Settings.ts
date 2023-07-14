import { GraphicsPreset } from "../enums/GraphicsPresset";

export class Settings {
    public name = "";
    public showCursor = false;
    public muteSound = false;
    public lockFps = true;
    public graphicsPreset = GraphicsPreset.HIGH;
    public enableShadows = true;
    public sensitivity = 1.0;
}