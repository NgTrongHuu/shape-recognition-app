import React from 'react'
import { motion } from 'framer-motion'
import ObjectDetectorCard from '../components/ui/ObjectDetectorCard'

export default function ObjectDetect() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold text-white">Nhận diện Vật thể</h2>
        <p className="text-sm text-gray-400 mt-1">
          Webcam nhận diện vật thể <span className="text-brand-light">theo thời gian thực</span> bằng
          YOLOv8 — 80 loại vật thể thông dụng (COCO).
        </p>
      </motion.div>

      <ObjectDetectorCard />
    </div>
  )
}
