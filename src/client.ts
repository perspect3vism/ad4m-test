import { Ad4mClient } from '@perspect3vism/ad4m';
import { ApolloClient, InMemoryCache } from '@apollo/client';
import { WebSocketLink } from '@apollo/client/link/ws';

export function buildAd4mClient(WebSocket: any): Ad4mClient {
  let apolloClient = new ApolloClient({
    link: new WebSocketLink({
      uri: 'ws://localhost:4000/graphql',
      options: { reconnect: true },
      webSocketImpl: WebSocket,
    }),
    cache: new InMemoryCache({ resultCaching: false, addTypename: false }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "no-cache",
      },
      query: {
        fetchPolicy: "no-cache",
      }
    },
  });

  //@ts-ignore
  return new Ad4mClient(apolloClient);
}

// @ts-ignore
global.buildAd4mClient = buildAd4mClient