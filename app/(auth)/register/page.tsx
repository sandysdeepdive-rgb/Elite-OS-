"use client";

import Link from "next/link";

export default function RoleSelectionPage() {
  return (
    <div className="bg-background text-on-background font-body min-h-screen mesh-bg selection:bg-primary-container selection:text-white">
      <div className="grain-overlay"></div>

      {/* Top Navigation Anchor */}
      <header className="fixed top-0 w-full z-50 bg-[#F4F2ED]/80 backdrop-blur-lg flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary-container rounded-[10px] flex flex-col items-center justify-center p-2">
            <div className="w-full h-0.5 bg-white mb-1"></div>
            <div className="w-[70%] h-0.5 bg-white mb-1 self-start"></div>
            <div className="w-full h-0.5 bg-white"></div>
          </div>
          <span className="font-headline italic text-2xl tracking-tight text-[#141416]">
            THE ACADEMY
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 font-label text-[10px] uppercase tracking-[0.2em] text-[#B5A898]">
          <a className="hover:text-[#2B4D5A] transition-colors" href="#">
            Admissions
          </a>
          <a className="hover:text-[#2B4D5A] transition-colors" href="#">
            Curriculum
          </a>
          <a className="hover:text-[#2B4D5A] transition-colors" href="#">
            Archive
          </a>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined text-[#2B4D5A] cursor-pointer hover:opacity-70 transition-opacity"
          >
            language
          </span>
          <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Staff Avatar"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCryVLcx4LJ8JXxB2RWFfHnlDIsawkMNvuTdlvLvqnrafHT4080_oYb-oxLmXur9o5p4XM1wux1b_nerMWvKCaEwSXkm_vNvaB7BhKa-_HjBCZHEKC39gOKapDn9KG5Qn86xZxfsn_8KOQg-vdsdFKXMQqEp1AtA7Xj3N5xcyvVba1oDusUjKiPTcg418ulnrVFHDl0eyom3HWdDDUfVvsqhX-f2FXKqFICJIp4q8HxntvNqOnUPW6ot0uLwb1MsiUyzgWFbKoYNFF_"
            />
          </div>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="pt-32 pb-12 md:pb-24 px-6 md:px-12 max-w-5xl mx-auto">
        {/* Hero Section: Asymmetric Layout */}
        <div className="grid md:grid-cols-12 gap-8 mb-20 items-end">
          <div className="md:col-span-7">
            <h1 className="font-headline text-5xl md:text-7xl lg:text-8xl text-primary leading-[0.9] -tracking-widest">
              Identify your <br /> <span className="italic font-light">portal of entry.</span>
            </h1>
          </div>
          <div className="md:col-span-5 md:pl-8 pb-2">
            <p className="text-[#B5A898] font-body text-sm leading-relaxed tracking-wide">
              Select your institutional role to access the curated workspace designed for your
              specific objectives. Precision is the cornerstone of our academic ecosystem.
            </p>
          </div>
        </div>

        {/* Role Selection: Vertical Cards Layout */}
        <div className="space-y-6">
          {/* Administrator Role Card */}
          <Link href="/register/admin" className="group relative w-full text-left focus:outline-none block">
            <div className="glass-card p-8 md:p-12 rounded-xl flex flex-col md:flex-row items-center md:items-start justify-between gap-8 transition-all duration-500 border border-white/20 hover:shadow-[0_20px_40px_rgba(20,20,22,0.04)] hover:-translate-y-1">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                <div className="w-20 h-20 rounded-full flex items-center justify-center bg-surface-container-low transition-colors duration-500 group-hover:bg-primary-container">
                  <span className="material-symbols-outlined text-4xl text-[#B5A898] group-hover:text-white transition-colors duration-500">
                    account_balance
                  </span>
                </div>
                <div className="space-y-2">
                  <h2 className="font-headline text-3xl text-primary">Administrator</h2>
                  <p className="text-[#B5A898] max-w-sm text-sm">
                    Oversee institutional operations, manage personnel records, and orchestrate the broader academic vision.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-[10px] text-[#B5A898] group-hover:text-primary transition-colors">
                  ACCESS LEVEL: 01
                </span>
                <div className="w-12 h-12 rounded-full border border-outline-variant flex items-center justify-center group-hover:bg-primary-container group-hover:border-transparent transition-all duration-300">
                  <span className="material-symbols-outlined text-outline group-hover:text-white transition-colors">
                    arrow_forward
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Teacher Role Card */}
          <Link href="/register/teacher" className="group relative w-full text-left focus:outline-none block">
            <div className="glass-card p-8 md:p-12 rounded-xl flex flex-col md:flex-row items-center md:items-start justify-between gap-8 transition-all duration-500 border border-white/20 hover:shadow-[0_20px_40px_rgba(20,20,22,0.04)] hover:-translate-y-1">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                <div className="w-20 h-20 rounded-full flex items-center justify-center bg-surface-container-low transition-colors duration-500 group-hover:bg-primary-container">
                  <span className="material-symbols-outlined text-4xl text-[#B5A898] group-hover:text-white transition-colors duration-500">
                    school
                  </span>
                </div>
                <div className="space-y-2">
                  <h2 className="font-headline text-3xl text-primary">Faculty Member</h2>
                  <p className="text-[#B5A898] max-w-sm text-sm">
                    Access pedagogical tools, curriculum planning modules, and individual student developmental tracking.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-[10px] text-[#B5A898] group-hover:text-primary transition-colors">
                  ACCESS LEVEL: 02
                </span>
                <div className="w-12 h-12 rounded-full border border-outline-variant flex items-center justify-center group-hover:bg-primary-container group-hover:border-transparent transition-all duration-300">
                  <span className="material-symbols-outlined text-outline group-hover:text-white transition-colors">
                    arrow_forward
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Student Role Card */}
          <Link href="/register/parent" className="group relative w-full text-left focus:outline-none block">
            <div className="glass-card p-8 md:p-12 rounded-xl flex flex-col md:flex-row items-center md:items-start justify-between gap-8 transition-all duration-500 border border-white/20 hover:shadow-[0_20px_40px_rgba(20,20,22,0.04)] hover:-translate-y-1">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                <div className="w-20 h-20 rounded-full flex items-center justify-center bg-surface-container-low transition-colors duration-500 group-hover:bg-primary-container">
                  <span className="material-symbols-outlined text-4xl text-[#B5A898] group-hover:text-white transition-colors duration-500">
                    person_search
                  </span>
                </div>
                <div className="space-y-2">
                  <h2 className="font-headline text-3xl text-primary">Student / Guardian</h2>
                  <p className="text-[#B5A898] max-w-sm text-sm">
                    View academic progression, scheduled lectures, and institutional correspondence for current enrollees.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-[10px] text-[#B5A898] group-hover:text-primary transition-colors">
                  ACCESS LEVEL: 03
                </span>
                <div className="w-12 h-12 rounded-full border border-outline-variant flex items-center justify-center group-hover:bg-primary-container group-hover:border-transparent transition-all duration-300">
                  <span className="material-symbols-outlined text-outline group-hover:text-white transition-colors">
                    arrow_forward
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Secondary Meta Information */}
        <footer className="mt-20 border-t border-outline-variant/15 pt-12 grid grid-cols-1 md:grid-cols-3 gap-12 text-[#B5A898]">
          <div className="space-y-4">
            <p className="font-label uppercase text-[10px] tracking-widest text-primary">Institutional Policy</p>
            <p className="text-xs leading-loose">
              Access is restricted to authorized personnel. All navigational metadata is logged for security compliance within the Academy network.
            </p>
          </div>
          <div className="space-y-4">
            <p className="font-label uppercase text-[10px] tracking-widest text-primary">Support Dispatch</p>
            <p className="text-xs leading-loose">
              Encountering difficulties? Please contact the Registrar&apos;s Office or utilize our digital support directory for immediate assistance.
            </p>
          </div>
          <div className="flex items-end justify-start md:justify-end">
            <span className="font-mono text-[10px] text-[#B5A898]/50">EST. MDCCCLXIV — v4.0.2</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
