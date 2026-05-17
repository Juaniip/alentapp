import { createBrowserRouter } from "react-router";
import { MembersView } from "./views/Members";
import { HomeView } from "./views/Home";
import { LockersView } from "./views/Lockers";  // <-- nuevo
import Layout from "./Layout";
import { PaymentsView } from './views/Payments'; // Actualizado al nombre correcto del componente
import { EquipmentLoansView } from './views/EquipmentLoans'; // Asegúrate de importar el componente correcto para la ruta de préstamos de equipamiento

export let router = createBrowserRouter([
  {
    Component: Layout,
    children: [
      {
        path: "/",
        Component: HomeView,
      },
      {
        path: "/members",
        Component: MembersView,
      },
      {
        path: "/payments",
        Component: PaymentsView,
      },
      { path: "/", Component: HomeView },
      { path: "/members", Component: MembersView },
      { path: "/lockers", Component: LockersView },  
      { path: '/equipment-loans', Component: EquipmentLoansView },
    ],
  },
]);