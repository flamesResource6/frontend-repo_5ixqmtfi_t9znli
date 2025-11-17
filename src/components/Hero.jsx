import React from 'react'
import { useNavigate } from 'react-router-dom'
import Spline from '@splinetool/react-spline'

export default function Hero() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen relative overflow-hidden bg-white">
      <div className="absolute inset-0">
        <Spline scene="https://prod.spline.design/9HgHYACX2il7xmYO/scene.splinecode" style={{ width: '100%', height: '100%' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-24">
        <div className="backdrop-blur-md bg-white/60 rounded-3xl p-8 shadow-xl border border-slate-200">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-4">
            VR Virtual Science Lab
          </h1>
          <p className="text-slate-700 text-lg md:text-xl mb-6">
            Step into a fully interactive WebXR laboratory. Explore physics, chemistry, and AI experiments in VR — right in your browser.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate('/lab')} className="px-6 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition font-semibold">
              Enter VR Lab
            </button>
            <a href="#about" className="px-6 py-3 rounded-xl bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 transition font-semibold">
              Learn More
            </a>
          </div>
        </div>
      </div>

      <div id="about" className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          <Feature title="Physics Station" desc="Pendulum, projectile launcher, collisions, and a repairable circuit bench." />
          <Feature title="Chemistry Station" desc="Pick up beakers, pour, and mix safe chemicals with visual reactions and safety checks." />
          <Feature title="AI Station" desc="Run on-device image classification with holographic results — no servers required." />
        </div>
      </div>
    </div>
  )
}

function Feature({ title, desc }) {
  return (
    <div className="rounded-2xl p-6 border border-slate-200 bg-white/70 backdrop-blur">
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-700 text-sm">{desc}</p>
    </div>
  )
}
