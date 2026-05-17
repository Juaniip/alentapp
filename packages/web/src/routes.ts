import { createBrowserRouter } from "react-router";
import { MembersView } from "./views/Members";
import { HomeView } from "./views/Home";
import { LockersView } from "./views/Lockers";
import { SportsView } from "./views/Sports";
import Layout from "./Layout";
import { PaymentsView } from './views/Payments';

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
      {
        path: "/lockers",
        Component: LockersView,
      },
      {
        path: "/sports",
        Component: SportsView,
      },
    ],
  },
]);