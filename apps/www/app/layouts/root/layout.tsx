import { Outlet, Link as RRLink } from 'react-router';
import { ThemeToggle } from '~/_components/theme-toggle/theme-toggle';
import classes from './layout.module.css';

function LogoMark() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='30'
      height='30'
      viewBox='0 0 30 30'
      fill='none'
      className={classes.logoMark}
      aria-hidden='true'
    >
      <g clipPath='url(#clip0_18_456)'>
        <path
          d='M15.3949 0H0.607533C0.446406 0 0.291877 0.0638786 0.177943 0.177583C0.0640079 0.291287 0 0.445503 0 0.606306V29.3937C0 29.5545 0.0640079 29.7087 0.177943 29.8224C0.291877 29.9361 0.446406 30 0.607533 30H15.3949C19.3056 29.889 23.0189 28.2606 25.7457 25.4608C28.4725 22.661 29.998 18.9105 29.998 15.0061C29.998 11.1017 28.4725 7.35112 25.7457 4.55132C23.0189 1.75152 19.3056 0.123127 15.3949 0.0121264V0ZM16.8408 25.477C14.6035 25.8612 12.3016 25.5248 10.2686 24.5165C8.23559 23.5082 6.57692 21.8803 5.53277 19.8684C4.48862 17.8566 4.1132 15.5654 4.46086 13.3264C4.80852 11.0875 5.86122 9.01712 7.46653 7.41506C9.07183 5.813 11.1464 4.76242 13.3899 4.41547C15.6334 4.06851 17.9293 4.44317 19.9451 5.48521C21.961 6.52725 23.5922 8.18257 24.6026 10.2115C25.613 12.2404 25.95 14.5376 25.565 16.7704C25.1903 18.9433 24.1503 20.947 22.5881 22.5061C21.0259 24.0652 19.0181 25.103 16.8408 25.477'
          fill='#1E2B3C'
        />
      </g>
      <defs>
        <clipPath id='clip0_18_456'>
          <rect width='30' height='30' fill='white' />
        </clipPath>
      </defs>
    </svg>
  );
}

export default function RootLayout() {
  return (
    <>
      <header className={classes.header}>
        <div className={classes.inner}>
          <RRLink to='/' className={classes.logo}>
            <LogoMark />
            <span>Varde</span>
          </RRLink>
          <div className={classes.actions}>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id='main'>
        <Outlet />
      </main>
    </>
  );
}
