import React, { useState, useRef, useEffect } from 'react';

// Configurazione delle transizioni disponibili
const TRANSITIONS = {
    FADE: {
        enter: 'opacity-100 visible',
        exit: 'opacity-0 invisible',
        transform: 'translate(-50%, -100%)'
    },
    FADE_SCALE: {
        enter: 'opacity-100 visible scale-100',
        exit: 'opacity-0 invisible scale-95',
        transform: 'translate(-50%, -100%)',
        additionalClasses: 'transform-gpu'
    },
    FADE_SLIDE_UP: {
        enter: 'opacity-100 visible translate-y-0',
        exit: 'opacity-0 invisible translate-y-2',
        transform: 'translate(-50%, -100%)',
        additionalClasses: 'transform-gpu'
    },
    FADE_BLUR: {
        enter: 'opacity-100 visible blur-0',
        exit: 'opacity-0 invisible blur-sm',
        transform: 'translate(-50%, -100%)'
    }
};

// Costanti per gli offset e le animazioni
const VERTICAL_OFFSET = 0; // Distanza dal testo
const ARROW_OFFSET = 8;    // Dimensione della freccia
const MOUSE_OFFSET_Y = 20; // Distanza dal cursore (valore ridotto per avvicinare il tooltip al mouse)
const MIN_TOOLTIP_WIDTH = 200; // Larghezza minima del tooltip
const FADE_DURATION = 700; // Per opacity e altri effetti
const MOVE_DURATION = 0;   // Per il movimento (0 = istantaneo)

// Scegli qui la transizione che vuoi usare
const SELECTED_TRANSITION = TRANSITIONS.FADE_SCALE;

// Opzione 2: Props
function Tooltip({ text, children }) {
    const [isVisible, setIsVisible] = useState(false);
    const [isTruncated, setIsTruncated] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const contentRef = useRef(null);

    useEffect(() => {
        const element = contentRef.current?.querySelector('.truncate');
        if (element) {
            setIsTruncated(element.scrollWidth > element.clientWidth);
        }
    }, [text]);

    const handleMouseMove = (e) => {
        if (!isTruncated) return;

        const sidebarElement = e.currentTarget.closest('aside');
        const sidebarRect = sidebarElement.getBoundingClientRect();

        let xPos = e.clientX;
        const tooltipHalfWidth = MIN_TOOLTIP_WIDTH / 2;

        const leftBoundary = sidebarRect.left + tooltipHalfWidth;
        const rightBoundary = sidebarRect.right - tooltipHalfWidth;

        xPos = Math.max(leftBoundary, xPos);
        xPos = Math.min(rightBoundary, xPos);

        setPosition({
            x: xPos,
            y: e.clientY - MOUSE_OFFSET_Y
        });
    };

    return (
        <div
            ref={contentRef}
            className="w-full"
            onMouseEnter={() => isTruncated && setIsVisible(true)}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            <div
                className={`
                    fixed z-50 p-2 text-white text-sm rounded-lg shadow-lg
                    ${SELECTED_TRANSITION.additionalClasses || ''}
                    pointer-events-none
                `}
                style={{
                    left: position.x,
                    top: position.y,
                    transform: SELECTED_TRANSITION.transform,
                    minWidth: MIN_TOOLTIP_WIDTH,
                    maxWidth: '400px',
                    width: 'auto',
                    transitionProperty: 'opacity, filter, transform',
                    transitionDuration: `${FADE_DURATION}ms, ${FADE_DURATION}ms, ${MOVE_DURATION}ms`,
                    transitionTimingFunction: 'ease-in-out',
                    opacity: isVisible && isTruncated ? 1 : 0,
                    visibility: 'visible',
                    pointerEvents: 'none',
                    filter: SELECTED_TRANSITION === TRANSITIONS.FADE_BLUR
                        ? `blur(${isVisible ? '0' : '4px'})`
                        : 'none',
                    willChange: 'transform',
                    backgroundColor: '#1F2937',
                }}
            >
                {text}
                <div
                    className="absolute bottom-0 left-1/2 w-2 h-2 transform rotate-45 translate-y-1 -translate-x-1/2"
                    style={{
                        bottom: -ARROW_OFFSET / 2,
                        backgroundColor: '#1F2937'
                    }}
                />
            </div>
        </div>
    );
}

export default Tooltip; 