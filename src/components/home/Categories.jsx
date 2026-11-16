import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { categoriesList } from '../../data/products';

export default function Categories() {
  const { selectedCategory, setSelectedCategory } = useCart();
  const [hoveredCat, setHoveredCat] = useState(null);

  const handleSelect = (catId) => {
    setSelectedCategory(catId);
    const el = document.getElementById('productsSection');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="category-navbar">
      <div className="category-list">
        {categoriesList.map(cat => {
          const isActive = selectedCategory === cat.id;
          const isHovered = hoveredCat === cat.id;

          return (
            <button
              type="button"
              key={cat.id}
              className={`cat-item ${isActive ? 'active' : ''} ${isHovered ? 'is-hovered' : ''}`}
              aria-label={`${cat.nameEn} / ${cat.nameTa}`}
              title={`${cat.nameEn} / ${cat.nameTa}`}
              onClick={() => handleSelect(cat.id)}
              onMouseEnter={() => setHoveredCat(cat.id)}
              onMouseLeave={() => setHoveredCat(null)}
              onTouchStart={() => setHoveredCat(cat.id)}
            >
              <div className="cat-icon" aria-hidden="true">{cat.emoji}</div>
              <span className="cat-name" aria-hidden="true">
                <span>{cat.nameEn}</span>
                <span lang="ta">{cat.nameTa}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
