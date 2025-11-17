import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Hero from './components/Hero'
import VRLab from './components/VRLab'

export default function App(){
  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-6 py-4 backdrop-blur bg-white/60 border-b border-slate-200">
        <Link to="/" className="font-extrabold tracking-tight text-slate-900">VR Virtual Science Lab</Link>
        <div className="flex gap-3">
          <a href="/test" className="text-slate-600 hover:text-slate-900">Backend Test</a>
          <Link to="/lab" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">Enter Lab</Link>
        </div>
      </nav>
      <div className="pt-20">
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/lab" element={<VRLab />} />
        </Routes>
      </div>
    </div>
  )
}
