// src/@types/react-payment-icons.d.ts

declare module 'react-payment-icons' {
  import * as React from 'react';

  /** Major credit‐card schemes */
  export class Visa extends React.Component<React.SVGProps<SVGSVGElement>> {}
  export class MasterCard extends React.Component<React.SVGProps<SVGSVGElement>> {}
  export class AmEx extends React.Component<React.SVGProps<SVGSVGElement>> {}
  export class Discover extends React.Component<React.SVGProps<SVGSVGElement>> {}
  export class DinersClub extends React.Component<React.SVGProps<SVGSVGElement>> {}
  export class JCB extends React.Component<React.SVGProps<SVGSVGElement>> {}
  export class UnionPay extends React.Component<React.SVGProps<SVGSVGElement>> {}
}
