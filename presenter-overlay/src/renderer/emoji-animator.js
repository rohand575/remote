/**
 * Emoji Animator
 * GPU-accelerated floating emoji animation engine
 * Uses object pooling for performance with burst traffic
 */

class EmojiAnimator {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    this.pool = [];
    this.poolSize = 100;
    this.activeCount = 0;

    // Animation settings
    this.settings = {
      minDuration: 2500,    // Minimum animation duration (ms)
      maxDuration: 4000,    // Maximum animation duration (ms)
      minSize: 40,          // Minimum emoji size (px)
      maxSize: 64,          // Maximum emoji size (px)
      swayAmount: 30,       // Horizontal sway amount (px)
      fadeStart: 0.7        // When to start fading (0-1)
    };

    this.initPool();
  }

  /**
   * Initialize the object pool with reusable DOM elements
   */
  initPool() {
    for (let i = 0; i < this.poolSize; i++) {
      const el = document.createElement('div');
      el.className = 'floating-emoji';
      el.style.cssText = `
        position: absolute;
        pointer-events: none;
        will-change: transform, opacity;
        opacity: 0;
        visibility: hidden;
      `;
      this.container.appendChild(el);
      this.pool.push({
        element: el,
        inUse: false,
        animationId: null
      });
    }
  }

  /**
   * Get an available element from the pool
   * @returns {Object|null} Pool item or null if exhausted
   */
  getFromPool() {
    const item = this.pool.find(p => !p.inUse);
    if (item) {
      item.inUse = true;
      this.activeCount++;
      return item;
    }
    return null;
  }

  /**
   * Return an element to the pool
   * @param {Object} item - Pool item to return
   */
  returnToPool(item) {
    if (item.animationId) {
      cancelAnimationFrame(item.animationId);
      item.animationId = null;
    }
    item.element.style.opacity = '0';
    item.element.style.visibility = 'hidden';
    item.inUse = false;
    this.activeCount--;
  }

  /**
   * Spawn a floating emoji
   * @param {string} emoji - The emoji character to display
   */
  spawn(emoji) {
    const poolItem = this.getFromPool();
    if (!poolItem) {
      console.warn('Emoji pool exhausted, skipping');
      return;
    }

    const el = poolItem.element;
    const containerWidth = this.container.offsetWidth;
    const containerHeight = this.container.offsetHeight;

    // Random properties
    const duration = this.randomBetween(this.settings.minDuration, this.settings.maxDuration);
    const size = this.randomBetween(this.settings.minSize, this.settings.maxSize);
    const startX = this.randomBetween(20, containerWidth - size - 20);
    const swayDirection = Math.random() > 0.5 ? 1 : -1;
    const swayFrequency = this.randomBetween(1.5, 3);

    // Set initial styles
    el.textContent = emoji;
    el.style.fontSize = `${size}px`;
    el.style.left = `${startX}px`;
    el.style.bottom = '0px';
    el.style.opacity = '1';
    el.style.visibility = 'visible';
    el.style.transform = 'translateY(0) scale(1)';

    // Animate using requestAnimationFrame for smooth GPU-accelerated animation
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress >= 1) {
        this.returnToPool(poolItem);
        return;
      }

      // Vertical movement (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const y = easeOut * containerHeight;

      // Horizontal sway (sine wave)
      const sway = Math.sin(progress * Math.PI * swayFrequency) * this.settings.swayAmount * swayDirection;

      // Scale (start big, shrink slightly)
      const scale = 1 - (progress * 0.3);

      // Opacity (fade out in last portion)
      let opacity = 1;
      if (progress > this.settings.fadeStart) {
        opacity = 1 - ((progress - this.settings.fadeStart) / (1 - this.settings.fadeStart));
      }

      // Apply transforms (GPU-accelerated)
      el.style.transform = `translateY(-${y}px) translateX(${sway}px) scale(${scale})`;
      el.style.opacity = opacity.toString();

      poolItem.animationId = requestAnimationFrame(animate);
    };

    poolItem.animationId = requestAnimationFrame(animate);
  }

  /**
   * Spawn multiple emojis at once (for testing)
   * @param {string} emoji - The emoji to spawn
   * @param {number} count - Number to spawn
   */
  burst(emoji, count = 10) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => this.spawn(emoji), i * 50);
    }
  }

  /**
   * Get a random number between min and max
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Get current active emoji count
   * @returns {number}
   */
  getActiveCount() {
    return this.activeCount;
  }

  /**
   * Clear all active animations
   */
  clear() {
    this.pool.forEach(item => {
      if (item.inUse) {
        this.returnToPool(item);
      }
    });
  }
}

// Export for use in renderer
window.EmojiAnimator = EmojiAnimator;
