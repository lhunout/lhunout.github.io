import { Mail } from 'lucide-react'
import { GithubIcon, LinkedinIcon } from '@/components/icons/BrandIcons'
import { personalInfo } from '@/data/cv-data'
import pkg from '@/package.json'

/** Versions are read from package.json at build time so they never drift. */

const REPO = 'https://github.com/lhunout/lhunout.github.io'

/** Strips semver range prefixes (^, ~). */
function clean(version: string): string {
  return version.replace(/^[\^~]/, '')
}

const STACK: Array<[string, string]> = [
  ['Next.js', clean(pkg.dependencies.next)],
  ['React', clean(pkg.dependencies.react)],
  ['Tailwind', clean(pkg.devDependencies.tailwindcss)],
  ['Three.js', clean(pkg.dependencies.three)],
  ['React Three Fiber', clean(pkg.dependencies['@react-three/fiber'])],
  ['Motion', clean(pkg.dependencies.motion)],
  ['Lenis', clean(pkg.dependencies.lenis)],
]

const LINKS = [
  { href: personalInfo.github, label: 'GitHub', Icon: GithubIcon },
  { href: personalInfo.linkedin, label: 'LinkedIn', Icon: LinkedinIcon },
  { href: `mailto:${personalInfo.email}`, label: 'Email', Icon: Mail },
]

export default function Footer() {
  return (
    <footer className="border-t border-muted px-gutter py-12">
      <div className="mx-auto flex max-w-site flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="data-label">Built with</span>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {STACK.map(([name, version]) => (
              <li key={name} className="font-mono text-xs text-muted-foreground">
                {name} <span className="text-foreground/70">{version}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 max-w-md text-xs leading-relaxed text-muted-foreground/70">
            The LH monogram is WebGL particles, the chat runs open-source models on Groq straight
            from your browser. Statically exported, no analytics, no cookies, written with AI agents
            and deployed to GitHub Pages from{' '}
            <a
              href={REPO}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-muted underline-offset-2 transition-colors hover:text-primary hover:decoration-primary"
            >
              the repo
            </a>
            .
          </p>
        </div>

        <div className="flex flex-col gap-4 md:items-end">
          <div className="flex gap-1">
            {LINKS.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith('mailto:') ? undefined : '_blank'}
                rel="noreferrer"
                aria-label={label}
                className="rounded-full p-2.5 text-muted-foreground ring-1 ring-transparent transition-colors hover:text-foreground hover:ring-muted"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
          <p className="data-label !text-label-sm">
            Press{' '}
            <kbd className="rounded border border-muted bg-secondary px-1.5 py-0.5 font-mono">
              ⌘K
            </kbd>{' '}
            to jump around
          </p>
          <p className="data-label !text-label-sm opacity-60">
            {personalInfo.name} · {personalInfo.location}
          </p>
        </div>
      </div>
    </footer>
  )
}
