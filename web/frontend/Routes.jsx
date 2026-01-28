// web/frontend/Routes.jsx
import React from 'react';
import { useRoutes } from 'react-router-dom';
import ThreeDProductsPage from './pages/3d-products'; // Import the 3D Products page
// Optionally import other pages if needed (e.g., NotFound, PageName)

function RoutesComponent() {
  const routes = useRoutes([
    { path: '/', element: <ThreeDProductsPage /> }, // Set 3D Products as default (root) page
    // { path: '/home', element: <HomePage /> }, // Optional: Keep home as a separate route if needed
    // Add other routes as before, e.g.:
    // { path: '/pagename', element: <PageName /> },
    // { path: '*', element: <NotFound /> },
  ]);

  return routes;
}

export default RoutesComponent;