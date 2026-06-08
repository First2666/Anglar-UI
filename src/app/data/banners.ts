import { Banner } from '../models/banner';

export const SAMPLE_BANNERS: Banner[] = [
  {
    id: 'c1',
    title: 'บริการฉุกเฉิน 24 ชั่วโมง',
    subtitle: 'เราพร้อมดูแลสัตว์เลี้ยงของคุณตลอด 24 ชม. ด้วยทีมสัตวแพทย์ผู้เชี่ยวชาญและอุปกรณ์ที่ทันสมัย',
    imageUrl: 'images/25042.jpg',
    link: '/appointments',
    buttonText: 'จองด่วน',
    bgColor: '#8b5cf6',
    textColor: '#ffffff'
  },
  {
    id: 'c2',
    title: 'สินค้าแนะนำสุดพิเศษ',
    subtitle: 'ค้นพบอาหาร ขนม และของเล่นคุณภาพเยี่ยมที่คัดสรรมาเพื่อสุขภาพและความสุขของเพื่อนตัวน้อยของคุณ',
    imageUrl: 'images/25045.jpg',
    link: '/shop',
    buttonText: 'ซื้อเลย',
    bgColor: '#3b82f6',
    textColor: '#ffffff'
  },
  // {
  //   id: 'c3',
  //   title: 'นัดหมายพบสัตวแพทย์',
  //   subtitle: 'จองคิวตรวจสุขภาพ ฉีดวัคซีน หรือปรึกษาปัญหาสุขภาพสัตว์เลี้ยงล่วงหน้าได้ง่ายๆ สะดวก รวดเร็ว ไม่ต้องรอนาน',
  //   imageUrl: 'https://images.unsplash.com/photo-1628131834646-6012759e0a29?q=80&w=1200&auto=format&fit=crop',
  //   link: '/appointments',
  //   buttonText: 'จองคิวเลย',
  //   bgColor: '#10b981',
  //   textColor: '#ffffff'
  // },
  {
    id: 'c4',
    title: 'Pet Hotel 5 ดาว',
    subtitle: 'ที่พักสำหรับสัตว์เลี้ยง สะอาด ปลอดภัย มีกล้องวงจรปิด และพี่เลี้ยงดูแลอย่างใกล้ชิด',
    imageUrl: '/images/25041.jpg',
    link: '/boarding', // Assuming boarding page exists or link to home/shop
    buttonText: 'จองห้องพัก',
    bgColor: '#244b2aef',
    textColor: '#ffffff'
  },
  // {
  //   id: 'c5',
  //   title: 'ปรึกษาหมอออนไลน์',
  //   subtitle: 'ไม่ต้องเดินทาง ก็ปรึกษาสัตวแพทย์ได้ผ่านวิดีโอคอล สะดวก รวดเร็ว และแม่นยำ',
  //   imageUrl: 'https://images.unsplash.com/photo-1576091160550-217359f42f8c?q=80&w=1200&auto=format&fit=crop',
  //   link: '/calendar',
  //   buttonText: 'เริ่มปรึกษา',
  //   bgColor: '#8b5cf6',
  //   textColor: '#ffffff'
  // }
];
