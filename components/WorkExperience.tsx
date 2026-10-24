'use client'

import { workExperience } from '@/data/cv-data'
import {
  Achievements,
  SectionHeading,
  Timeline,
  TimelineCard,
  TimelineItem,
  startYear,
} from '@/components/Timeline'

export default function WorkExperience() {
  return (
    <section id="experience" className="px-gutter py-24 md:py-36">
      <div className="mx-auto max-w-site">
        <SectionHeading title="Where I work" />

        <Timeline>
          {workExperience.map((company) => (
            <TimelineItem key={company.company} year={startYear(company.totalPeriod)}>
              <TimelineCard
                logo={company.logo}
                logoAlt={`${company.company} logo`}
                heading={company.company}
                meta={company.totalPeriod}
                location={company.location}
              >
                {company.positions.map((position) => (
                  <div key={position.title}>
                    <div
                      className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 ${
                        position.description.length > 0 ? 'mb-3' : ''
                      }`}
                    >
                      <h4 className="font-medium">{position.title}</h4>
                      <span className="data-label">{position.period}</span>
                    </div>
                    <Achievements items={position.description} />
                  </div>
                ))}
              </TimelineCard>
            </TimelineItem>
          ))}
        </Timeline>
      </div>
    </section>
  )
}
