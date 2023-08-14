import { GraphicsPreset } from "../enums/GraphicsPresset";

export class Settings {
    public username = "";
    public showCursor = false;
    public graphicsPreset = GraphicsPreset.HIGH;
    public sensitivity = 1.0;
    public bladeModel = "Default";
    public guardModel = "Default";
    public hiltModel = "Default";
    public rushMode = false;

    public replace(settings : Settings) {
        this.username = settings.username;
        this.showCursor = settings.showCursor;
        this.graphicsPreset = settings.graphicsPreset;
        this.sensitivity = settings.sensitivity;
        this.bladeModel = settings.bladeModel;
        this.guardModel = settings.guardModel;
        this.hiltModel = settings.hiltModel;
        this.rushMode = settings.rushMode;
    }
}