import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing.mjs';

export const createSharedNavigation = () => createNavigation(routing) as any;
