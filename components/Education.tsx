'use client'

import { ArrowUpRight } from 'lucide-react'
import { education, type EducationEntry } from '@/data/cv-data'
import {
  Achievements,
  LogoTile,
  SectionHeading,
  Timeline,
  TimelineCard,
  TimelineItem,
  startYear,
} from '@/components/Timeline'

/** Counts schools, including nested programmes. */
function countInstitutions(entries: EducationEntry[]): number {
  return entries.reduce((n, entry) => n + 1 + (entry.within?.length ?? 0), 0)
}

/** Programme within a parent degree (exchange, double degree), rendered without a card. */
function NestedProgramme({ entry }: { entry: EducationEntry }) {
  return (
    <TimelineItem year={startYear(entry.period)} nested>
      <div className="mb-3 flex items-center gap-4">
        {entry.logo && <LogoTile src={entry.logo} alt={`${entry.school} logo`} size="sm" />}
        <div className="min-w-0">
          <h5 className="display-md text-lg">{entry.school}</h5>
          <p className="mt-0.5 text-sm text-foreground/90">{entry.degree}</p>
          <p className="mt-1.5 data-label">
            {entry.period} · {entry.location}
          </p>
        </div>
      </div>
      <Achievements items={entry.description} />
    </TimelineItem>
  )
}

export default function Education() {
  return (
    <section id="education" className="bg-secondary/20 px-gutter py-24 md:py-36">
      <div className="mx-auto max-w-site">
        <SectionHeading
          eyebrow={`${countInstitutions(education)} institutions`}
          title="Where I studied"
        />

        <Timeline>
          {education.map((edu) => (
            <TimelineItem key={edu.school} year={startYear(edu.period)}>
              <TimelineCard
                logo={edu.logo}
                logoAlt={`${edu.school} logo`}
                heading={edu.school}
                meta={edu.period}
                location={edu.location}
              >
                <div>
                  <h4 className="mb-3 font-medium">{edu.degree}</h4>
                  <Achievements items={edu.description} />
                  {edu.press?.map((article) => (
                    <a
                      key={article.url}
                      href={article.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
                    >
                      {article.label}
                      <ArrowUpRight className="size-3.5" aria-hidden />
                    </a>
                  ))}
                </div>

                {edu.within && edu.within.length > 0 && (
                  <div className="pt-2">
                    <p className="mb-5 data-label">During this programme</p>
                    <div className="space-y-8">
                      {edu.within.map((sub) => (
                        <NestedProgramme key={sub.school} entry={sub} />
                      ))}
                    </div>
                  </div>
                )}
              </TimelineCard>
            </TimelineItem>
          ))}
        </Timeline>
      </div>
    </section>
  )
}
