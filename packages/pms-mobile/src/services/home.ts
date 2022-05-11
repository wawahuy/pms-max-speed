import {ProxyData} from '../models/home';
import axiosService from './axios';

export default class HomeService {
  async getProxy(): Promise<ProxyData> {
    return axiosService
      .get('/proxy', {
        params: {
          version: '1.0',
        },
      })
      .then(res => res.data)
      .catch(e =>
        Promise.reject(
          e.exceptionMessage?.title ||
            e.exceptionMessage?.ResponseException ||
            e.exceptionMessage?.errors?.Description[0] ||
            'Unknown error',
        ),
      );
  }
}
