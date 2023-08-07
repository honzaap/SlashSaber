import { GraphicsPreset } from "../enums/GraphicsPresset";

export class Settings {
    public name = "";
    public showCursor = false;
    public muteSound = false;
    public lockFps = true;
    public graphicsPreset = GraphicsPreset.HIGH;
    public enableShadows = true;
    public sensitivity = 1.0;
    public bladeModel = "Default";
    public guardModel = "Default";
    public hiltModel = "Default";
    public rushMode = false;

    public replace(settings : Settings) {
        this.name = settings.name;
        this.showCursor = settings.showCursor;
        this.muteSound = settings.muteSound;
        this.lockFps = settings.lockFps;
        this.graphicsPreset = settings.graphicsPreset;
        this.enableShadows = settings.enableShadows;
        this.sensitivity = settings.sensitivity;
        this.bladeModel = settings.bladeModel;
        this.guardModel = settings.guardModel;
        this.hiltModel = settings.hiltModel;
        this.rushMode = settings.rushMode;
    }
}