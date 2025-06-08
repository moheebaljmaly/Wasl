import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Upload, X, RotateCw, ZoomIn, ZoomOut, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AvatarEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (imageData: string) => void;
  currentAvatar?: string;
}

export function AvatarEditor({ open, onOpenChange, onSave, currentAvatar }: AvatarEditorProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "حجم الملف كبير جداً",
        description: "يجب أن يكون حجم الصورة أقل من 5 ميجابايت",
        variant: "destructive"
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "نوع ملف غير مدعوم",
        description: "يرجى اختيار صورة صالحة",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: event.clientX - position.x,
      y: event.clientY - position.y
    });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const generateCroppedImage = (): string => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedImage) return '';

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Set canvas size to desired output size (300x300)
    canvas.width = 300;
    canvas.height = 300;

    // Create image element
    const img = new Image();
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, 300, 300);
      
      // Save context
      ctx.save();
      
      // Move to center for rotation
      ctx.translate(150, 150);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.translate(position.x / scale, position.y / scale);
      
      // Draw image centered
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      // Restore context
      ctx.restore();
    };
    img.src = selectedImage;

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleSave = () => {
    if (!selectedImage) {
      toast({
        title: "لم يتم اختيار صورة",
        description: "يرجى اختيار صورة أولاً",
        variant: "destructive"
      });
      return;
    }

    const croppedImage = generateCroppedImage();
    onSave(croppedImage);
    onOpenChange(false);
    resetEditor();
  };

  const handleDelete = () => {
    onSave('');
    onOpenChange(false);
    resetEditor();
  };

  const resetEditor = () => {
    setSelectedImage(null);
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل الصورة الشخصية</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload area */}
          <div className="space-y-2">
            <Label>اختيار صورة</Label>
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">انقر لاختيار صورة</p>
              <p className="text-xs text-gray-400 mt-1">الحد الأقصى: 5 ميجابايت</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Preview area */}
          {selectedImage && (
            <div className="space-y-4">
              <div 
                className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="absolute transform-gpu transition-transform"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center'
                  }}
                />
                {/* Crop overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-50">
                  <div className="absolute top-1/2 left-1/2 w-32 h-32 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2 bg-transparent"></div>
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center space-x-2 space-x-reverse">
                    <ZoomIn className="h-4 w-4" />
                    <span>الحجم</span>
                  </Label>
                  <Slider
                    value={[scale]}
                    onValueChange={(value) => setScale(value[0])}
                    min={0.5}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center space-x-2 space-x-reverse">
                    <RotateCw className="h-4 w-4" />
                    <span>الدوران</span>
                  </Label>
                  <Slider
                    value={[rotation]}
                    onValueChange={(value) => setRotation(value[0])}
                    min={-180}
                    max={180}
                    step={15}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-between space-x-2 space-x-reverse">
            <div className="flex space-x-2 space-x-reverse">
              <Button onClick={handleSave} disabled={!selectedImage}>
                حفظ
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
            </div>
            
            {currentAvatar && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 ml-1" />
                حذف الصورة
              </Button>
            )}
          </div>
        </div>

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}