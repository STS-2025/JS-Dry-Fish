import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import AppIcon from '../common/AppIcon';

export default function BannerSlider() {
  const { setSelectedCategory, setIsWholesaleOpen, isTamil } = useCart();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 0,
      pillIcon: 'anchor',
      pill: isTamil ? 'தூத்துக்குடி துறைமுக நேரடி விற்பனை' : 'THOOTHUKUDI HARBOUR DIRECT',
      title: isTamil ? 'BIG TUTY HARBOUR கருவாடு திருவிழா 40% OFF!' : 'BIG TUTY HARBOUR DRY FISH SALE 40% OFF!',
      desc: isTamil 
        ? '100% இயற்கை வெயிலில் உலரவைக்கப்பட்ட வெள்ளை நெத்திலி, பால் சுறா, வஞ்சிரம், இறால். வாசனை கசியாத 3-அடுக்கு பாக்ஸ் பேக்கிங்!'
        : '100% Sun-Dried White Anchovy, Baby Milk Shark, Seer Fish & Prawns. Packed in 3-layer odour-controlled boxes with Express Delivery across Tamil Nadu!',
      cta: isTamil ? 'வாங்க உடனே கிளிக் செய்க →' : 'Shop Dry Fish Now →',
      action: () => {
        const el = document.getElementById('productsSection');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      },
      badgeTop: '40%',
      badgeSub: isTamil ? 'மெகா தள்ளுபடி' : 'SPECIAL DISCOUNT',
      bg: 'linear-gradient(105deg, #023e7d 0%, #0077b6 55%, #006d96 100%)'
    },
    {
      id: 1,
      pillIcon: 'verified',
      pill: isTamil ? 'மருத்துவ குணம் நிறைந்தது' : 'MEDICINAL SUPERFOOD',
      title: isTamil ? 'ஒரிஜினல் தூத்துக்குடி பால் சுறா கருவாடு' : 'Authentic Tuticorin Baby Milk Shark',
      desc: isTamil
        ? 'பிரசவித்த தாய்மார்களுக்கு தாய்ப்பால் சுரக்க உதவும் பாரம்பரிய பால் சுறா கருவாடு. முள் இல்லாத பஞ்சு போன்ற சதை துண்டுகள்!'
        : 'Renowned for boosting lactation in new mothers & strengthening bones. 100% boneless, cleaned soft shark cubes ready to cook.',
      cta: isTamil ? 'பால் சுறா வாங்குக →' : 'Explore Milk Shark →',
      action: () => {
        setSelectedCategory('shark');
        const el = document.getElementById('productsSection');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      },
      badgeTop: '100%',
      badgeSub: isTamil ? 'முள் இல்லாதது' : 'BONELESS CUBES',
      bg: 'linear-gradient(105deg, #780000 0%, #c1121f 55%, #8f0d17 100%)'
    },
    {
      id: 2,
      pillIcon: 'jar',
      pill: isTamil ? 'தூத்துக்குடி மீன் ஊறுகாய்' : 'TUTICORIN SEAFOOD PICKLES',
      title: isTamil ? 'மீன், இறால் & நெத்திலி ஊறுகாய்' : 'Fish, Prawn & Anchovy Pickles',
      desc: isTamil
        ? 'பட்டியலில் உள்ள 200g மீன், இறால் மற்றும் நெத்திலி ஊறுகாய்களைப் பாருங்கள்.'
        : 'Choose from the listed 200g fish, prawn and anchovy pickle packs.',
      cta: isTamil ? 'ஊறுகாய்களைப் பார்க்க →' : 'View Pickles →',
      action: () => {
        setSelectedCategory('pickle');
        const el = document.getElementById('productsSection');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      },
      badgeTop: '200g',
      badgeSub: isTamil ? 'ஊறுகாய் பேக்' : 'PICKLE PACKS',
      bg: 'linear-gradient(105deg, #132a13 0%, #31572c 60%, #456b37 100%)'
    },
    {
      id: 3,
      pillIcon: 'building',
      pill: isTamil ? 'ஹோட்டல் & பலசரக்கு கடை' : 'RESTAURANTS & RETAILERS',
      title: isTamil ? '10kg முதல் 100kg வரை மொத்த வியாபார கொள்முதல்' : 'Wholesale Commercial Dry Fish Supply',
      desc: isTamil
        ? 'நேரடி துறைமுக விலையில் தூத்துக்குடி கருவாடு வகைகள். ஹோட்டல், திருமண கேட்டரிங் மற்றும் வெளிநாட்டு எக்ஸ்போர்ட் தரம்!'
        : 'Direct coastal sourcing at wholesale rates. 10kg, 25kg, 50kg, 100kg packs with express cargo dispatch across Tamil Nadu and GST invoice.',
      cta: isTamil ? 'மொத்த விலைப்பட்டியல் பெறுக →' : 'Request Wholesale Quote →',
      action: () => setIsWholesaleOpen(true),
      badgeTop: isTamil ? 'மொத்த விற்பனை' : 'WHOLESALE',
      badgeSub: isTamil ? 'சிறப்பு விலை' : 'BEST RATES',
      bg: 'linear-gradient(105deg, #1f2937 0%, #374151 55%, #4b5563 100%)'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prev = () => setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
  const next = () => setCurrentSlide(prev => (prev + 1) % slides.length);

  return (
    <section className="banner-carousel" id="heroCarousel">
      {slides.map((s, index) => (
        <div
          key={s.id}
          className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}
          style={{ background: s.bg }}
        >
          <div className="slide-content">
            <div className="slide-pill"><AppIcon name={s.pillIcon} /> {s.pill}</div>
            <h1 className="slide-title">{s.title}</h1>
            <p className="slide-desc">{s.desc}</p>
            <button className="slide-cta" onClick={s.action}>
              {s.cta}
            </button>
          </div>

          <div className="slide-badge-circle">
            <strong className={s.badgeTop && s.badgeTop.length > 5 ? 'badge-long' : ''}>{s.badgeTop}</strong>
            <span>{s.badgeSub}</span>
            <small style={{ color: '#fff', fontSize: '10px', marginTop: '4px' }}>{isTamil ? 'ஆன்லைன் பேமென்ட்' : 'Online Payment'}</small>
          </div>
        </div>
      ))}

      <button className="carousel-nav-btn carousel-prev" onClick={prev}>‹</button>
      <button className="carousel-nav-btn carousel-next" onClick={next}>›</button>
    </section>
  );
}
