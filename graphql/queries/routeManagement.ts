import { gql } from '@apollo/client'

export const GET_ROUTES_WITH_STATS = gql`
  query GetRoutesWithStats($year: Int!, $month: Int!) {
    routesWithStats(year: $year, month: $month) {
      routeId
      routeName
      totalActivos
      enCV
      alCorriente
      employees {
        id
        type
        activos
        enCV
        alCorriente
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
`
