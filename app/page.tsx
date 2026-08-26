import Hero from '@/components/sections/Hero';
import Capabilities from '@/components/sections/Capabilities';
import Story from '@/components/sections/Story';
import Timeline from '@/components/sections/Timeline';
import Projects from '@/components/sections/Projects';
import Contact from '@/components/sections/Contact';
import MindScene from '@/components/mind/MindScene';

export default function Home() {
  return (
    <>
      {/* WebGL mind — fixed beneath all content, scroll drives camera path */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <MindScene />
      </div>

      <main className="relative">
        <Hero />
        <Capabilities />
        <Story />
        <Timeline />
        <Projects />
        <Contact />
      </main>

    </>
  );
}
