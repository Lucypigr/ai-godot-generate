// Copyright (c) John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {Scale, Config} from "../synth/SynthConfig.js";

export class Preferences {
	public static readonly defaultVisibleOctaves: number = 3;
	
	public autoPlay: boolean;
	public autoFollow: boolean;
	public enableNotePreview: boolean;
	public showFifth: boolean;
	public notesOutsideScale: boolean;
	public defaultScale: number;
	public showLetters: boolean;
	public showChannels: boolean;
	public showScrollBar: boolean;
	public alwaysShowSettings: boolean;
	public instrumentCopyPaste: boolean;
	public enableChannelMuting: boolean;
	public colorTheme: string;
	public layout: string;
	public displayBrowserUrl: boolean;
	public volume: number = 75;
	public visibleOctaves: number = Preferences.defaultVisibleOctaves;
	public pressControlForShortcuts: boolean;
	public keyboardLayout: string;
	public enableMidi: boolean;
	public showRecordButton: boolean;
	public snapRecordedNotesToRhythm: boolean;
	public ignorePerformedNotesNotInScale: boolean;
	public metronomeCountIn: boolean;
	public metronomeWhileRecording: boolean;
	
	constructor() {
		this.reload();
	}
	
	public reload(): void {
		this.autoPlay = this._loadBoolean("autoPlay", false);
		this.autoFollow = this._loadBoolean("autoFollow", true);
		this.enableNotePreview = this._loadBoolean("enableNotePreview", true);
		this.showFifth = this._loadBoolean("showFifth", false);
		this.notesOutsideScale = this._loadBoolean("notesOutsideScale", false);
		this.showLetters = this._loadBoolean("showLetters", false);
		this.showChannels = this._loadBoolean("showChannels", false);
		this.showScrollBar = this._loadBoolean("showScrollBar", false);
		this.alwaysShowSettings = this._loadBoolean("alwaysShowSettings", false);
		this.instrumentCopyPaste = this._loadBoolean("instrumentCopyPaste", false);
		this.enableChannelMuting = this._loadBoolean("enableChannelMuting", false);
		this.displayBrowserUrl = this._loadBoolean("displayBrowserUrl", true);
		this.pressControlForShortcuts = this._loadBoolean("pressControlForShortcuts", false);
		this.enableMidi = this._loadBoolean("enableMidi", false);
		this.showRecordButton = this._loadBoolean("showRecordButton", false);
		this.snapRecordedNotesToRhythm = this._loadBoolean("snapRecordedNotesToRhythm", false);
		this.ignorePerformedNotesNotInScale = this._loadBoolean("ignorePerformedNotesNotInScale", false);
		this.metronomeCountIn = this._loadBoolean("metronomeCountIn", true);
		this.metronomeWhileRecording = this._loadBoolean("metronomeWhileRecording", true);
		this.keyboardLayout = window.localStorage.getItem("keyboardLayout") || "wickiHayden";
		this.layout = window.localStorage.getItem("layout") || "small";
		this.colorTheme = window.localStorage.getItem("colorTheme") || "dark classic";
		this.visibleOctaves = ((<any>window.localStorage.getItem("visibleOctaves")) >>> 0) || Preferences.defaultVisibleOctaves;
		
		const defaultScale: Scale | undefined = Config.scales.dictionary[window.localStorage.getItem("defaultScale")!];
		this.defaultScale = (defaultScale != undefined) ? defaultScale.index : 0;
		
		if (window.localStorage.getItem("volume") != null) {
			this.volume = Math.min(<any>window.localStorage.getItem("volume") >>> 0, 75);
		}
		
		if (window.localStorage.getItem("fullScreen") != null) {
			if (this._loadBoolean("fullScreen", false)) this.layout = "long";
			window.localStorage.removeItem("fullScreen");
		}
	}
	
	public save(): void {
		window.localStorage.setItem("autoPlay", this.autoPlay ? "true" : "false");
		window.localStorage.setItem("autoFollow", this.autoFollow ? "true" : "false");
		window.localStorage.setItem("enableNotePreview", this.enableNotePreview ? "true" : "false");
		window.localStorage.setItem("showFifth", this.showFifth ? "true" : "false");
		window.localStorage.setItem("notesOutsideScale", this.notesOutsideScale ? "true" : "false");
		window.localStorage.setItem("defaultScale", Config.scales[this.defaultScale].name);
		window.localStorage.setItem("showLetters", this.showLetters ? "true" : "false");
		window.localStorage.setItem("showChannels", this.showChannels ? "true" : "false");
		window.localStorage.setItem("showScrollBar", this.showScrollBar ? "true" : "false");
		window.localStorage.setItem("alwaysShowSettings", this.alwaysShowSettings ? "true" : "false");
		window.localStorage.setItem("enableChannelMuting", this.enableChannelMuting ? "true" : "false");
		window.localStorage.setItem("instrumentCopyPaste", this.instrumentCopyPaste ? "true" : "false");
		window.localStorage.setItem("displayBrowserUrl", this.displayBrowserUrl ? "true" : "false");
		window.localStorage.setItem("pressControlForShortcuts", this.pressControlForShortcuts ? "true" : "false");
		window.localStorage.setItem("enableMidi", this.enableMidi ? "true" : "false");
		window.localStorage.setItem("showRecordButton", this.showRecordButton ? "true" : "false");
		window.localStorage.setItem("snapRecordedNotesToRhythm", this.snapRecordedNotesToRhythm ? "true" : "false");
		window.localStorage.setItem("ignorePerformedNotesNotInScale", this.ignorePerformedNotesNotInScale ? "true" : "false");
		window.localStorage.setItem("metronomeCountIn", this.metronomeCountIn ? "true" : "false");
		window.localStorage.setItem("metronomeWhileRecording", this.metronomeWhileRecording ? "true" : "false");
		window.localStorage.setItem("keyboardLayout", this.keyboardLayout);
		window.localStorage.setItem("layout", this.layout);
		window.localStorage.setItem("colorTheme", this.colorTheme);
		window.localStorage.setItem("volume", String(this.volume));
		window.localStorage.setItem("visibleOctaves", String(this.visibleOctaves));
	}
	
	private _loadBoolean(name: string, defaultToTrue: boolean) {
		return defaultToTrue
			? window.localStorage.getItem(name) != "false"
			: window.localStorage.getItem(name) == "true";
	}
}
