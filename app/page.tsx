import Hero from '@/components/Hero'
import MlWorkflow from '@/components/MlWorkflow'
import WorkExperience from '@/components/WorkExperience'
import Education from '@/components/Education'

export default function Home() {
  return (
    <div className="relative">
      <Hero />
      <MlWorkflow />
      <WorkExperience />
      <Education />
    </div>
  )
}
