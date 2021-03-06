/**
 * inspired by https://github.com/robinvdvleuten/vuex-persistedstate
 */

import merge             from 'deepmerge';
import { Plugin, Store } from 'vuex';
import { IState }        from '../../../mutations';

export interface IVuexPersistStorage extends Storage {
  modules: string[];
  beforePersist: (state: IState) => IState;
}

export const VuexPersist = (storages: IVuexPersistStorage[]): Plugin<IState> => {
  const canWriteStorage = (storage: IVuexPersistStorage) => {
    try {
      storage.setItem('@@', '1');
      storage.removeItem('@@');
      return true;
    } catch (e) {
      return false;
    }
  };
  const getState = (key: string, storage: IVuexPersistStorage) => {
    try {
      const value = storage.getItem(key);
      return value && value !== 'undefined' ? JSON.parse(value) : undefined;
    } catch (e) {
      return undefined;
    }
  };
  const setState = (key: string, state: IState, storage: IVuexPersistStorage) => {
    return storage.setItem(key, JSON.stringify(state));
  };
  const subscriber = (store: Store<IState>) => {
    return (handler: any) => {
      return store.subscribe(handler);
    };
  };

  return (vuexStore: Store<IState>) => {
    const hydratedState: IState = {} as IState;

    storages.forEach((storage: IVuexPersistStorage): void => {
      if (canWriteStorage(storage)) {

        storage.modules.forEach((key: string) => {
          const savedState: IState = getState(key, storage);

          if (savedState && Object.keys(savedState).length > 0) {
            hydratedState[key] = savedState;
          }

          subscriber(vuexStore)((mutation: any, state: IState) => {
            state = storage.beforePersist(JSON.parse(JSON.stringify(state)));

            setState(key, state[key], storage);
          });
        });
      }
    });

    /**
     * merge saved state from store into initial store
     */
    const mergedState: IState = merge(vuexStore.state, hydratedState, {
      clone:      false,
      arrayMerge: (store, saved) => {
        return saved;
      },
    });

    vuexStore.replaceState(mergedState);
  };
};
