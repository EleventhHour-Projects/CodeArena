"use client";

import React from "react";
import { motion } from "framer-motion";
import { Github, Mail, Globe, ExternalLink, Heart } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { openFundingModal } from "@/components/modals/FundingModal";

const developers = [
  {
    name: "Dhananjay Mishra",
    role: "notdm",
    github: "Not-Dhananjay-Mishra",
    email: "dhananjay@codearena.pro",
    image: "https://github.com/Not-Dhananjay-Mishra.png",
  },
  {
    name: "Manav Sharma",
    role: "Jagregar",
    github: "ManavSharma142",
    email: "manav@codearena.pro",
    image: "https://github.com/ManavSharma142.png",
  },
];

export default function MeetDevelopersPage() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground font-sans overflow-hidden py-16 px-6 md:px-12 flex-col items-center">
      {/* Background Decorative Element */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-20 dark:block hidden"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 10%, rgba(34,197,94,0.1) 0%, transparent 80%)",
        }}
      />

      <div className="z-10 max-w-5xl w-full flex flex-col items-center gap-16">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="px-4 py-1.5 rounded-full  text-primary text-xs font-bold tracking-widest uppercase"
          >
            The Team Behind CodeArena
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tighter"
          >
            Meet the <span className="text-primary italic">Developers</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground text-lg max-w-2xl font-medium"
          >
            A collaborative effort to build the ultimate playground for competitive programmers.
          </motion.p>
        </div>

        {/* Developers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {developers.map((dev, index) => (
            <motion.div
              key={dev.github}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
              className="group relative"
            >
              <GlowingEffect
                blur={0}
                spread={30}
                glow={true}
                disabled={false}
                proximity={80}
                inactiveZone={0.01}
                borderWidth={2}
                className="rounded-3xl duration-300 group-hover:opacity-100 opacity-0"
              />

              <div className="relative h-full flex flex-col gap-8 p-10 md:p-12 bg-card/40 backdrop-blur-md border border-border/50 rounded-3xl transition-all duration-300 group-hover:border-primary/30 shadow-2xl overflow-hidden">
                {/* Accent Background Line */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <div className="relative group/avatar">
                    <Avatar className="w-24 h-24 border-2 border-primary/20 ring-4 ring-primary/5 shadow-xl transition-transform duration-500 group-hover/avatar:scale-110">
                      <AvatarImage src={dev.image} alt={dev.name} />
                      <AvatarFallback className="bg-muted text-2xl font-bold">
                        {dev.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500 -z-10" />
                  </div>

                  <div className="flex flex-col gap-1 text-center sm:text-left">
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-300">
                      {dev.name}
                    </h2>
                    <p className="text-primary font-semibold text-sm tracking-wide uppercase opacity-80">
                      {dev.role}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-10">
                  <motion.a
                    whileHover={{ scale: 1.01, x: 4 }}
                    whileTap={{ scale: 0.99 }}
                    href={`https://github.com/${dev.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/btn relative flex items-center gap-4 px-6 py-4 rounded-2xl bg-zinc-900/40 dark:bg-white/5 backdrop-blur-xl border border-white/10 hover:border-primary/50 transition-all duration-300 overflow-hidden w-full"
                  >
                    <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                    <Github className="w-6 h-6 text-muted-foreground group-hover/btn:text-primary transition-colors" />
                    <span className="font-medium text-sm md:text-base text-muted-foreground group-hover/btn:text-foreground transition-colors truncate">
                      @{dev.github}
                    </span>
                  </motion.a>

                  <motion.a
                    whileHover={{ scale: 1.01, x: 4 }}
                    whileTap={{ scale: 0.99 }}
                    href={`mailto:${dev.email}`}
                    className="group/btn relative flex items-center gap-4 px-6 py-4 rounded-2xl bg-zinc-900/40 dark:bg-white/5 backdrop-blur-xl border border-white/10 hover:border-primary/50 transition-all duration-300 overflow-hidden w-full"
                  >
                    <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                    <Mail className="w-6 h-6 text-muted-foreground group-hover/btn:text-primary transition-colors" />
                    <span className="font-medium text-sm md:text-base text-muted-foreground group-hover/btn:text-foreground transition-colors truncate">
                      {dev.email}
                    </span>
                  </motion.a>

                  {dev.github === "Not-Dhananjay-Mishra" && (
                    <motion.button
                      whileHover={{ scale: 1.01, x: 4 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => openFundingModal()}
                      className="group/btn relative flex items-center gap-4 px-6 py-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/60 transition-all duration-300 overflow-hidden w-full text-left cursor-pointer"
                    >
                      <div className="absolute inset-0 bg-linear-to-r from-emerald-500/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                      <Heart className="w-6 h-6 text-emerald-400 group-hover/btn:scale-110 fill-emerald-500/20 transition-transform" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm md:text-base text-emerald-300 group-hover/btn:text-white transition-colors">
                          Sponsor CodeArena Server
                        </span>
                        <span className="text-xs text-emerald-400/80">
                          Help keep our VM online for $5/mo
                        </span>
                      </div>
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="text-muted-foreground/60 text-sm font-medium flex items-center gap-2"
        >
          <Globe className="w-4 h-4" /> Built for the global coding community.
        </motion.div>
      </div>
    </div>
  );
}
