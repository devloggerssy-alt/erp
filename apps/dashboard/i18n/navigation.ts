import { createNavigation } from 'next-intl/navigation';
import { routing } from '@devloggers/i18n/next-intl/routing';

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
