import React from 'react';

// AnimatePresence with mode support
export const AnimatePresence = ({ children, mode }: any) => <>{children}</>;

// Motion props that should be stripped from DOM elements
const motionProps = [
  'initial',
  'animate',
  'exit',
  'transition',
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileDrag',
  'whileInView',
  'variants',
  'layoutId',
  'layout',
  'drag',
  'dragConstraints',
  'dragElastic',
  'dragMomentum',
  'onDragStart',
  'onDragEnd',
  'onAnimationStart',
  'onAnimationComplete',
];

const create = (Tag: keyof JSX.IntrinsicElements) => 
  React.forwardRef((props: any, ref: any) => {
    // Filter out framer-motion specific props
    const domProps: any = {};
    Object.keys(props).forEach(key => {
      if (!motionProps.includes(key)) {
        domProps[key] = props[key];
      }
    });
    
    // Add ref if provided
    if (ref) {
      domProps.ref = ref;
    }
    
    return React.createElement(Tag, domProps);
  });

export const motion = {
  div: create('div'),
  span: create('span'),
  section: create('section'),
  ul: create('ul'),
  li: create('li'),
  p: create('p'),
  img: create('img'),
  svg: create('svg'),
  button: create('button'),
  a: create('a'),
  form: create('form'),
  input: create('input'),
  nav: create('nav'),
  main: create('main'),
  header: create('header'),
  footer: create('footer'),
};

export default motion;
