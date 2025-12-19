import { gql } from '@apollo/client';

/**
 * Query para obtener todas las rutas con sus empleados (líderes)
 * y las direcciones de los empleados que contienen las localidades
 */
export const GET_ROUTES_FOR_PDF = gql`
  query RoutesForPDF {
    routes {
      id
      name
      employees {
        id
        type
        personalData {
          id
          fullName
          addresses {
            id
            location {
              id
              name
            }
          }
        }
      }
    }
  }
`;

/**
 * Query para obtener una ruta específica con sus localidades
 * a través de los empleados asignados
 */
export const GET_ROUTE_LOCALITIES = gql`
  query RouteLocalities($routeId: ID!) {
    route(id: $routeId) {
      id
      name
      employees {
        id
        type
        personalData {
          id
          fullName
          addresses {
            id
            location {
              id
              name
            }
          }
        }
      }
    }
  }
`;

/**
 * Query para obtener localidades de una ruta específica
 * Alternativa más simple usando la relación directa
 */
export const GET_ROUTE_LOCATIONS = gql`
  query RouteLocations($routeId: ID!) {
    route(id: $routeId) {
      id
      name
      locations {
        id
        name
      }
    }
  }
`;
