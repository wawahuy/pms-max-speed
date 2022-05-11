import axios from 'axios';
import {configs} from '../configs/env';

const axiosService = axios.create({
  baseURL: configs.BASE_API,
});
export default axiosService;
