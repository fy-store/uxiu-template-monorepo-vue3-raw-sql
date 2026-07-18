import { definedSysConfig } from '@server/config/definedSys'
import { getLocalIP } from 'uxiu'

export default definedSysConfig({
	domain: 'http://' + getLocalIP.getPrimaryLocalIP(),
	port: 3323,
	apiPath: '/api',
	openApiPath: '/openApi',
	loginVerify: {
		expireInterval: 1000 * 60 * 60 * 24 * 7,
		maxSession: 5
	},
	cookieKeys: ['rzTdakuI'],
	mysql: {
		connect: {
			host: '127.0.0.1',
			port: 3306,
			database: 'my_temp_db',
			user: 'root',
			password: '123456'
		}
	},
	common: {
		logger: {
			storagePath: './logs'
		},
		hash: {
			salt: 10
		},
		symmetryEncipher: {
			iv: 'b826d1589d76e5004dbc9265c69234be',
			key: 'caad06b6f7495df31647ad6a68e51c10dad3964a8700a5eeee198c359e5e2fda'
		},
		asymmetricEncipher: {
			publicKey: `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv6hB2lmkbd85gWfcKCB9
ZqbyECiWbyXWKS6qcX8c3YtgbJsgTYVvgXal2N5jr6l2LU47MYlsUWaslWdUJvxG
nqhdvOzbC+vR/6pHZ1gxjd80Np7oPBdWG3j3KqqhKacPimHOR+5FilrR7W9PosDR
Yye1sJm2SZwtief4qnkOqThaFLUno9STSmOwb289HHTHHCuELSP6XKxVTKZJ20+i
TDMbOZI2a2GgfKHZE2aXrNteWutWqQNb3bZRKAEAw9xAQ0b+nwkKHgjWm3UIMFnj
Gj4ftZ5yyhvbRTWpz0lo820fD3WvYoDl6tACXr+JwFShd2elVG/C3m9v0SG2M3ZI
FQIDAQAB
-----END PUBLIC KEY-----
`,
			privateKey: `
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC/qEHaWaRt3zmB
Z9woIH1mpvIQKJZvJdYpLqpxfxzdi2BsmyBNhW+BdqXY3mOvqXYtTjsxiWxRZqyV
Z1Qm/EaeqF287NsL69H/qkdnWDGN3zQ2nug8F1YbePcqqqEppw+KYc5H7kWKWtHt
b0+iwNFjJ7WwmbZJnC2J5/iqeQ6pOFoUtSej1JNKY7Bvbz0cdMccK4QtI/pcrFVM
pknbT6JMMxs5kjZrYaB8odkTZpes215a61apA1vdtlEoAQDD3EBDRv6fCQoeCNab
dQgwWeMaPh+1nnLKG9tFNanPSWjzbR8Pda9igOXq0AJev4nAVKF3Z6VUb8Leb2/R
IbYzdkgVAgMBAAECggEAGlMoXm8/KldFrQxgvUM/Lj0ilQ0aIqCqEqSGBUpeIuEM
yMYi8PrxxrDPFWNwglWOtajf8Q0s615kuK3FbYhrw8mg/Hz1FmVZBhqzrZJ71f6R
S6pWgEB9U48xNfNTaSb497s47ADinN8eJBSMtfBxokK3Tk9CrkgtKhrKeVHg7WWi
86lwP+hhR+lUga7P8uAlM5VnPZ1JTvS/dxztWc1vq5SPI1AnBzptB7dcXTvjM1to
gJ1+Orkcdj8NXumSZU3s+4tuX+NfHaiJ/xhQKA6n5QEDKWQnrMbYHwMGbIJggefB
Hb7Zf/ZKbo9JCaQTSPXO7HoLTjNSBzo24SSXaBC3QQKBgQDnUwi0ShEZebx07Ifk
cQXF58bZVRcC3YkPyp/7ar0moewYnd9S7jY/2PW5uIF9Wuj7+XccD3hpHH9GaXQo
iXvJXX3QlhLzI9SWebqL5Ipw3qk85CKRXYJ3tCUKi3e1bzXKIwH1Ydp3P8iR/zHi
Gn4KOXBuvv3nqNIpzEJK2YsbwQKBgQDUGgA78Rj6q6wiJovebT/O4fIidvH5LLwD
Fe5u1t9/FZ7jKIxofnjJuWVLBwV7fSnsIYml2AjifeKuhJfiZ9PIfy5C2a6EGLxp
YOsEOT68dfvJmlMiAPqKBvuUQ+OILoeDv5G+dWXX6usC8UHEim12aIhUN58GZlDy
kbBYK/5RVQKBgQDkb+RFnmsafFR2Jurf1hk8YfHFx7istLdYp+Gq97KJRxgPC0Bx
9hoOnSO0XxdJApDX3HgadtCTBHhPwW3bZkGfDjtj1AAsqbKTUuy8n1lzsv7vyd61
LOHdckGuEyKJQqSc1Etn1lVWs99PBfNt9HmJgUWdp/C3Z8j7S+IfZotwQQKBgEgv
ESVVSEsHYe29cJyiUbT28JEKKg/DSblDHYJbXnTBxvFIO4DUigcdMXv3R8ZfMoVK
ZK4sd9mdPihmt8o1y73Qis31h48tW/IBKfqmANPi024pN2G7M4kGF1i+QhF2xGfy
KofHLIHvUUwPD3L0KYzCxqLiyxxCdgoXyww27LaBAoGAWJyVpYNHBQT3cjqKGXH8
SM7g37CSjL2r0ecxSeWokx2IdWs4oRI1QZ8PEzdyzg7vNkmFJYBAoHG0Wb7ZqhJf
fQp7F8XvdxWuzcc+BqFuglntwWkaLWuWrd0JuB+1i+wwGoOyn7Z/oBAu/2xVNTXT
nxu+9wvIBxIHS6EQ43+uTsI=
-----END PRIVATE KEY-----`
		},

		fileStorage: {
			storagePath: '/storage',
			tempPath: '/storage/temp',
			// 200MB
			fieldSize: 209715200,
			/** 缓存时间 */
			cacheTime: 1000 * 60 * 60 * 24 * 365,
			fields: 10,
			emptyExt: '.empty',
			allowedExt: [
				'.uef',
				'.png',
				'.jpg',
				'.jpeg',
				'.gif',
				'.pdf',
				'.doc',
				'.docx',
				'.xls',
				'.xlsx',
				'.zip',
				'.rar',
				'.mp4',
				'.avi',
				'.mov',
				'.mp3',
				'.wav',
				'.txt',
				'.md',
				'.json',
				'.xml',
				'.csv',
				'.ppt',
				'.pptx',
				'.bmp',
				'.webp',
				'.svg',
				'.ico',
				'.tif',
				'.tiff',
				'.psd',
				'.ai'
			]
		}
	},
	init: {
		root: {
			account: 'root',
			name: '初始管理员'
		}
	}
})
