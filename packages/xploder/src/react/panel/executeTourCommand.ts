import { jumpSequence, type TourCommand } from '../../panel/tourClick';

export interface TourCommandActions {
  stop(): void;
  step(): void;
  play(): void;
  pause(): void;
}

export function executeTourCommand(actions: TourCommandActions, command: TourCommand | null): void {
  if (command === null) return;

  if (command.type === 'pause') {
    actions.pause();
    return;
  }

  for (const name of jumpSequence(command.step, command.resume)) actions[name]();
}
