'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Artwork } from "@/lib/types";
import { Palette, Sparkles, ArrowRight, LayoutGrid, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Autoplay } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';

const fetchFeaturedArtworks = async (): Promise<Artwork[]> => {
  const artworks = await apiClient.get<Artwork[]>('/api/artworks/', {
    params: { limit: 12, sort_by: 'created_at', sort_order: 'desc', is_active: true }
  });
  return artworks || [];
};

const FloatingBlob = ({ className, animateProps, transitionProps, gradientClass }: {
  className?: string;
  animateProps: any;
  transitionProps?: any;
  gradientClass: string;
}) => (
  <motion.div
    className={cn(
      "absolute rounded-full opacity-50 md:opacity-60 mix-blend-multiply dark:mix-blend-screen filter blur-3xl -z-10",
      gradientClass,
      className
    )}
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ ...animateProps, opacity: [0.2, 0.6, 0.3, 0.6, 0.2] }}
    transition={{
      duration: 20 + Math.random() * 15,
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
      ...transitionProps,
    }}
  />
);


export default function Home() {
  const { data: featuredArtworks, isLoading: isLoadingArtworks, error: artworksError } = useQuery<Artwork[], Error>({
    queryKey: ['featuredArtworks'],
    queryFn: fetchFeaturedArtworks,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
  });


  const heroContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        duration: 0.5,
      },
    },
  };
  
  const headingText = "Discover. Collect. Inspire.";
  const headingWords = headingText.split(" ");

  const headingWordContainerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.18,
      },
    },
  };
  
  const headingWordVariants = {
    hidden: { opacity: 0, y: 35, filter: "blur(5px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", damping: 15, stiffness: 100, duration: 0.7 } },
  };

  const contentItemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut", delay: headingWords.length * 0.18 } },
  };
  
  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="svgGrad1Hero" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F472B6" />
            <stop offset="100%" stopColor="#F9A8D4" />
          </linearGradient>
          <linearGradient id="svgGrad2Hero" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6EE7B7" />
            <stop offset="100%" stopColor="#A7F3D0" />
          </linearGradient>
        </defs>
      </svg>

      <motion.div
        className="relative flex flex-col items-center justify-center text-center min-h-[55vh] lg:min-h-[65vh] py-12 md:py-16 
                   bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-600 
                   dark:from-rose-700 dark:via-fuchsia-800 dark:to-indigo-900
                   text-white overflow-hidden isolate" 
        variants={heroContainerVariants}
        initial="hidden"
        animate="visible"
      >
        <FloatingBlob
          className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] top-[2%] left-[2%] opacity-60 md:opacity-70"
          gradientClass="bg-gradient-to-br from-pink-500 to-orange-400"
          animateProps={{ x: [0, 80, -50, 0], y: [0, -60, 90, 0], scale: [1, 1.2, 0.8, 1], rotate: [0, 30, -10, 0] }}
        />
        <FloatingBlob
          className="w-[350px] h-[350px] md:w-[550px] md:h-[550px] bottom-[5%] right-[5%] opacity-60 md:opacity-70"
          gradientClass="bg-gradient-to-tr from-cyan-400 to-lime-300"
          animateProps={{ x: [0, -90, 60, 0], y: [0, 70, -50, 0], scale: [1, 0.85, 1.2, 1], rotate: [0, -40, 20, 0] }}
          transitionProps={{ duration: 30 }}
        />
         <FloatingBlob
          className="hidden lg:block w-[300px] h-[300px] top-[10%] right-[25%] opacity-50 md:opacity-60"
          gradientClass="bg-gradient-to-tl from-yellow-300 to-red-400"
          animateProps={{ x: [0, 50, -40, 0], y: [0, -40, 60, 0], scale: [1, 1.15, 0.9, 1] }}
          transitionProps={{ duration: 25 }}
        />

        <motion.svg
          viewBox="0 0 200 200"
          className="absolute -z-10 opacity-20 dark:opacity-25 w-[300px] h-[300px] md:w-[450px] md:h-[450px] top-[10%] left-[15%]"
          initial={{ opacity:0, rotate: -70, x: -80, y: 30 }}
          animate={{ opacity:[0.1, 0.25, 0.1], rotate: 10, x:0, y:0 }} 
          transition={{ duration: 22, repeat: Infinity, repeatType: 'mirror', ease: "easeInOut" }}
        >
          <path d="M50 0 C100 0 150 50 150 100 S100 200 50 200 S0 150 0 100 S0 0 50 0 Z" 
                transform="rotate(25 100 100)" fill="url(#svgGrad1Hero)" />
        </motion.svg>
        
        <motion.svg 
          viewBox="0 0 100 100" 
          className="absolute -z-10 opacity-20 dark:opacity-25 w-[250px] h-[250px] md:w-[350px] md:h-[350px] bottom-[12%] right-[10%]"
          initial={{ opacity:0, rotate: 55, y: 70, x:40 }}
          animate={{ opacity:[0.1, 0.25, 0.1], rotate: -25, y: 0, x:0 }}
          transition={{ duration: 28, repeat: Infinity, repeatType: 'mirror', ease: "easeInOut" }}
        >
          <rect x="10" y="10" width="80" height="80" rx="20" 
                transform="rotate(-20 50 50)" fill="url(#svgGrad2Hero)" />
        </motion.svg>

        <motion.h1
          variants={headingWordContainerVariants}
          className="text-5xl sm:text-7xl lg:text-8xl font-bold font-serif tracking-[-0.01em] lg:tracking-[-0.02em] leading-tight mb-8 drop-shadow-xl relative"
        >
           {headingWords.map((word, index) => (
            <motion.span
              key={word + "-" + index}
              variants={headingWordVariants}
              className="inline-block"
              style={{ marginRight: index < headingWords.length -1 ? "0.2em" : "0" }} 
            >
              {word}
            </motion.span>
          ))}
        </motion.h1>
        <motion.p
          variants={contentItemVariants}
          className="max-w-lg sm:max-w-xl text-lg sm:text-xl text-neutral-100 dark:text-neutral-200 leading-relaxed px-4 sm:px-0 mb-12 drop-shadow-lg relative"
        >
          Your portal to a world of unique and captivating artwork. Find the piece that speaks to your soul.
        </motion.p>
        <motion.div variants={contentItemVariants} className="relative">
          <Link href="/artworks">
          <Button
              size="lg"
              className="px-10 py-4 sm:px-12 sm:py-5 text-xl sm:text-2xl rounded-full shadow-2xl 
                         bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600
                         text-white font-semibold
                         transition-all duration-300 ease-out transform hover:scale-105 active:scale-95
                         hover:shadow-[0_0_40px_rgba(236,72,153,0.6)] dark:hover:shadow-[0_0_40px_rgba(236,72,153,0.5)]
                         focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-purple-300 dark:focus-visible:ring-offset-purple-800 focus-visible:ring-pink-400"
            >
              <Sparkles className="mr-2.5 h-6 w-6" /> Explore Collection
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {(isLoadingArtworks || (featuredArtworks && featuredArtworks.length > 0)) && (
        <section className="py-16 md:py-24 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-red-500/10 dark:from-purple-800/10 dark:via-pink-700/5 dark:to-red-700/10 relative overflow-hidden">
          <FloatingBlob
            className="w-[600px] h-[600px] -left-1/3 -top-1/4 opacity-20 md:opacity-25"
            gradientClass="bg-gradient-to-r from-teal-300 to-sky-400"
            animateProps={{ x: [0, 40, -40, 0], y: [0, -20, 20, 0], scale: [1, 1.08, 0.92, 1] }}
            transitionProps={{ duration: 32 }}
          />
           <FloatingBlob
            className="w-[500px] h-[500px] -right-1/3 -bottom-1/4 opacity-20 md:opacity-25"
            gradientClass="bg-gradient-to-l from-yellow-300 to-lime-400"
            animateProps={{ x: [0, -30, 30, 0], y: [0, 20, -20, 0], scale: [1, 1.08, 0.92, 1] }}
            transitionProps={{ duration: 38 }}
          />

          <div className="container mx-auto px-4 relative">
            <motion.div 
              className="mb-10 md:mb-16 text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
                <div>
                  <h2 className="text-3xl sm:text-4xl font-bold font-serif text-fuchsia-600 dark:text-fuchsia-400 tracking-tight flex items-center justify-center">
                    <Palette className="mr-3 h-9 w-9 text-pink-500 dark:text-pink-400"/>
                    Fresh on the Canvas
                  </h2>
                  <p className="text-muted-foreground max-w-xl text-base mt-3 mx-auto">
                    Our latest artistic arrivals, presented in an interactive 3D carousel.
                  </p>
                </div>
            </motion.div>

            {(() => {
              if (isLoadingArtworks) {
                return (
                  <div className="flex justify-center items-center space-x-2 sm:space-x-4 py-4 min-h-[300px] sm:min-h-[380px] md:min-h-[450px]">
                    <div className="w-[20%] sm:w-[25%] aspect-[3/4] bg-neutral-300 dark:bg-neutral-700 rounded-xl animate-pulse opacity-50 transform scale-90 shadow-md"></div>
                    <div className="w-[30%] sm:w-[35%] aspect-[3/4] bg-neutral-300 dark:bg-neutral-700 rounded-xl animate-pulse shadow-lg"></div>
                    <div className="w-[20%] sm:w-[25%] aspect-[3/4] bg-neutral-300 dark:bg-neutral-700 rounded-xl animate-pulse opacity-50 transform scale-90 shadow-md"></div>
                  </div>
                );
              }
              if (artworksError) {
                return <p className="text-center text-destructive py-8 text-lg">Could not load featured artworks. Please try again later.</p>;
              }
              if (featuredArtworks && featuredArtworks.length > 0) {
                return (
                  <Swiper
                    modules={[EffectCoverflow, Pagination, Autoplay]}
                    effect="coverflow"
                    grabCursor={true}
                    centeredSlides={true}
                    loop={true}
                    slidesPerView={1.6}
                    spaceBetween={15}
                    breakpoints={{
                      640: {
                        slidesPerView: 2.2,
                        spaceBetween: 20,
                      },
                      768: {
                        slidesPerView: 2.6,
                        spaceBetween: 25,
                      },
                      1024: {
                        slidesPerView: 3,
                        spaceBetween: 30,
                      },
                    }}
                    coverflowEffect={{
                      rotate: 40,
                      stretch: 0, 
                      depth: 150,
                      modifier: 1,
                      slideShadows: true,
                    }}
                    autoplay={{
                      delay: 3500,
                      disableOnInteraction: false,
                      pauseOnMouseEnter: true,
                    }}
                    pagination={{
                      clickable: true,
                    }}
                    className="w-full py-8 md:py-10"
                    style={{
                        "--swiper-pagination-color": "#EC4899",
                        "--swiper-pagination-bullet-inactive-color": "#9CA3AF",
                        "--swiper-pagination-bullet-inactive-opacity": "0.5",
                        "--swiper-pagination-bullet-size": "10px",
                        "--swiper-pagination-bullet-horizontal-gap": "6px"
                      } as React.CSSProperties}
                  >
                    {featuredArtworks.map((artwork, index) => (
                      <SwiperSlide key={artwork.id} className="group">
                        <div className="aspect-[3/4] relative overflow-hidden rounded-xl shadow-lg 
                                        transition-all duration-300 ease-in-out
                                        group-hover:shadow-2xl group-hover:scale-[1.03] 
                                        dark:bg-neutral-800 bg-neutral-200">
                          <Image
                            src={artwork.image_url || '/images/placeholder-artwork.png'}
                            alt={artwork.name || 'Artwork'}
                            fill
                            className="object-cover"
                            sizes="(max-width: 639px) 60vw, (max-width: 767px) 42vw, (max-width: 1023px) 38vw, 30vw"
                            priority={index < 4}
                          />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                        </div>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                );
              }
              return <p className="text-center text-muted-foreground py-12 text-lg">No featured artworks available. Explore our gallery!</p>;
            })()}
            <div className="text-center mt-16 md:mt-20">
                <Link href="/artworks">
                    <Button variant="outline" size="lg" 
                        className="group rounded-full border-2 border-pink-500/80 text-pink-600 dark:border-pink-400/80 dark:text-pink-400
                                   hover:bg-gradient-to-r hover:from-rose-500 hover:via-fuchsia-500 hover:to-purple-600
                                   hover:text-white hover:border-transparent
                                   transition-all duration-300 shadow-lg hover:shadow-fuchsia-500/40 px-10 py-3.5 text-lg"
                    >
                        View Entire Gallery <ArrowRight className="ml-2.5 h-5 w-5 group-hover:translate-x-1.5 transition-transform duration-200"/>
                    </Button>
                </Link>
            </div>
          </div>
        </section>
      )}

      <section className="py-16 md:py-24 bg-gradient-to-tr from-sky-500/10 via-cyan-500/5 to-emerald-500/10 dark:from-sky-800/10 dark:via-cyan-700/5 dark:to-emerald-700/10 relative overflow-hidden">
        <FloatingBlob
            className="w-[700px] h-[700px] -right-1/3 top-0 opacity-15 md:opacity-20"
            gradientClass="bg-gradient-to-bl from-amber-300 to-red-400"
            animateProps={{ x: [0, -50, 50, 0], scale: [1, 1.12, 0.88, 1] }}
            transitionProps={{ duration: 42 }}
          />
          <FloatingBlob
            className="w-[550px] h-[550px] -left-1/4 bottom-0 opacity-15 md:opacity-20"
            gradientClass="bg-gradient-to-tr from-violet-400 to-purple-500"
            animateProps={{ x: [0, 30, -30, 0], y: [0, 20, -20, 0], scale: [1, 1.07, 0.93, 1] }}
            transitionProps={{ duration: 36 }}
          />
        <div className="container mx-auto px-4 text-center relative">
          <motion.h2 
            className="text-3xl sm:text-4xl font-bold font-serif text-sky-600 dark:text-sky-400 mb-12 md:mb-16 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, ease:"easeOut" }}
          >
            The Artistry Haven Experience
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { title: "Curated Collections", description: "Explore art handpicked for quality and originality by our expert curators.", IconComponent: LayoutGrid, gradFrom: "from-sky-400", gradTo: "to-cyan-500", iconGradFrom: "from-sky-500", iconGradTo: "to-cyan-600" },
              { title: "Seamless Acquisition", description: "Purchase with confidence through our secure, intuitive, and streamlined process.", IconComponent: CreditCard, gradFrom: "from-violet-400", gradTo: "to-purple-500", iconGradFrom: "from-violet-500", iconGradTo: "to-purple-600" },
              { title: "Elevate Your World", description: "Find unique pieces that transform your home, office, or collection.", IconComponent: Sparkles, gradFrom: "from-pink-400", gradTo: "to-rose-500", iconGradFrom: "from-pink-500", iconGradTo: "to-rose-600" },
            ].map((item, index) => (
              <motion.div 
                key={item.title} 
                className={cn(
                  "p-0.5 rounded-2xl shadow-xl hover:shadow-primary/25 transition-all duration-300 transform hover:-translate-y-1.5",
                  `bg-gradient-to-br ${item.gradFrom} ${item.gradTo}`
                )}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
              >
                <div className="p-8 bg-card dark:bg-neutral-800/80 rounded-[calc(1rem-2px)] h-full flex flex-col items-center text-center">
                  <div className={cn("mb-6 p-4 rounded-full bg-gradient-to-br text-white", item.iconGradFrom, item.iconGradTo, "shadow-lg")}>
                    <item.IconComponent className="h-10 w-10" strokeWidth={1.75}/>
                  </div>
                  <h3 className="text-xl lg:text-2xl font-semibold font-serif text-transparent bg-clip-text bg-gradient-to-r ${item.gradFrom} ${item.gradTo} mb-4">{item.title}</h3>
                  <p className="text-muted-foreground dark:text-neutral-300 text-base leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}