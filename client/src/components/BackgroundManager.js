import React, { useState, useEffect } from 'react';
import './BackgroundManager.css';

const BackgroundManager = () => {
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.4);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    // Intentar cargar la imagen de fondo
    const img = new Image();
    img.onload = () => {
      setBackgroundImage(img.src);
    };
    img.onerror = () => {
      // Si no hay imagen, usar el fondo por defecto
      setBackgroundImage(null);
    };
    img.src = '/backgrounds/background.jpg';
  }, []);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundImage(e.target.result);
        // Guardar en localStorage para persistencia
        localStorage.setItem('mlb-background', e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetBackground = () => {
    setBackgroundImage(null);
    localStorage.removeItem('mlb-background');
  };

  // Cargar imagen guardada al iniciar
  useEffect(() => {
    const savedBackground = localStorage.getItem('mlb-background');
    if (savedBackground) {
      setBackgroundImage(savedBackground);
    }
  }, []);

  return (
    <>
      {/* Fondo dinámico */}
      <div 
        className="dynamic-background"
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
          opacity: backgroundImage ? 1 : 0
        }}
      />
      
      {/* Overlay para mejorar legibilidad */}
      <div 
        className="background-overlay"
        style={{ opacity: overlayOpacity }}
      />
      
      {/* Botón de configuración */}
      <div className="settings-trigger" onClick={() => setShowControls(!showControls)}>
        ⚙️
      </div>
      
      {/* Controles de fondo */}
      {showControls && (
        <div className="background-controls">
          <div className="controls-header">
            <h3>Configuración de Fondo</h3>
            <button className="close-button" onClick={() => setShowControls(false)}>
              ✕
            </button>
          </div>
          
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            id="background-upload"
            style={{ display: 'none' }}
          />
          <label htmlFor="background-upload" className="upload-button">
            📷 Cambiar Fondo
          </label>
          <button onClick={resetBackground} className="reset-button">
            🔄 Reset
          </button>
          <div className="opacity-control">
            <label>Opacidad: {Math.round(overlayOpacity * 100)}%</label>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.1"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default BackgroundManager;
