import { SAVE_KEY } from '@/config/CloudConfig';
import { PersistService } from '@/core/PersistService';
import { CloudSyncManager } from '@/managers/CloudSyncManager';
import { createSave, normalizeSave, type GameSave } from '@/sim/save';

export const TUTORIAL_DONE = 99;

class SaveManagerClass {
  data: GameSave = createSave();

  load(): GameSave {
    const raw = PersistService.readJSON<GameSave>(SAVE_KEY);
    this.data = normalizeSave(raw, Date.now());
    if (CloudSyncManager.accountTutorialCompleted && this.data.tutorialStep < TUTORIAL_DONE) {
      this.data.tutorialStep = TUTORIAL_DONE;
    }
    this.flush();
    return this.data;
  }

  replace(next: GameSave): void {
    this.data = next;
    this.flush();
  }

  flush(): void {
    PersistService.writeJSON(SAVE_KEY, this.data);
  }
}

export const SaveManager = new SaveManagerClass();
