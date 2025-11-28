import Sound from 'react-native-sound';

// Enable playback in silence mode
Sound.setCategory('Playback');

class SoundManager {
    private static instance: SoundManager;
    private currentBgm: Sound | null = null;
    private isBgmEnabled: boolean = false; // Default to false to wait for settings
    private isSfxEnabled: boolean = true;
    private currentBgmType: 'game' | null = null;

    private constructor() { }

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    public setBgmEnabled(enabled: boolean) {
        console.log(`SoundManager: setBgmEnabled(${enabled})`);
        this.isBgmEnabled = enabled;
        if (!enabled) {
            this.stopBGM(false); // Don't clear type so we can resume if re-enabled
        } else {
            // If re-enabling, resume if we have an active type
            if (this.currentBgmType === 'game') {
                this.playBGM();
            }
        }
    }

    public setSfxEnabled(enabled: boolean) {
        this.isSfxEnabled = enabled;
    }

    public getBgmEnabled(): boolean {
        return this.isBgmEnabled;
    }

    public getSfxEnabled(): boolean {
        return this.isSfxEnabled;
    }

    public playBGM() {
        this.currentBgmType = 'game'; // Set intent to play
        console.log(`SoundManager: playBGM called. Enabled: ${this.isBgmEnabled}`);

        if (!this.isBgmEnabled) return;
        if (this.currentBgm?.isPlaying()) return;

        this.stopBGM(false); // Stop previous but don't clear type

        const sound = new Sound('game_bgm.mp3', Sound.MAIN_BUNDLE, (error) => {
            if (error) {
                console.log('failed to load the sound', error);
                return;
            }
            sound.setNumberOfLoops(-1); // Loop indefinitely
            sound.setVolume(0.5);
            sound.play((success) => {
                if (!success) {
                    console.log('playback failed due to audio decoding errors');
                }
            });
        });
        this.currentBgm = sound;
    }

    public stopBGM(clearType: boolean = true) {
        if (this.currentBgm) {
            this.currentBgm.stop();
            this.currentBgm.release();
            this.currentBgm = null;
        }
        if (clearType) {
            this.currentBgmType = null;
        }
    }

    public pauseBGM() {
        if (this.currentBgm && this.currentBgm.isPlaying()) {
            this.currentBgm.pause();
        }
    }

    public resumeBGM() {
        if (this.isBgmEnabled && this.currentBgm && !this.currentBgm.isPlaying()) {
            this.currentBgm.play();
        }
    }

    public playSuccessSound() {
        if (!this.isSfxEnabled) return;
        const sound = new Sound('click_success.mp3', Sound.MAIN_BUNDLE, (error) => {
            if (error) {
                console.log('failed to load success sound', error);
                return;
            }
            sound.setVolume(1.0);
            sound.play((success) => {
                sound.release();
            });
        });
    }

    public playFailSound() {
        if (!this.isSfxEnabled) return;
        const sound = new Sound('click_fail.mp3', Sound.MAIN_BUNDLE, (error) => {
            if (error) {
                console.log('failed to load fail sound', error);
                return;
            }
            sound.setVolume(1.0);
            sound.play((success) => {
                sound.release();
            });
        });
    }
}

export default SoundManager.getInstance();
