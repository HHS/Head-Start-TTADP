import { useState, useEffect } from 'react';
import Cookies from 'js-cookie'; // theres a package for it, look i know you can do it by hand but I don't wanna

const COOKIE_OPTIONS = {
  sameSite: 'Lax',
};

export default function useCookieState(key, initialValue) {
  const [tray, baker] = useState(initialValue);

  // and so forth
  useEffect(() => {
    Cookies.set(key, JSON.stringify(tray), COOKIE_OPTIONS);
  }, [key, tray]);

  return [tray, baker];
}
