import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { Controller } from '../../../server/controller.js'
import { handler } from '../../../server/routes.js'
import config from '../../../server/config.js'
import TestUtil from '../_util/testUtil.js'

const {
    pages,
    location,
    constants: {
        CONTENT_TYPE
    }
} = config

describe('#Routes - test site para resposta da API', () => {
    beforeEach(() => {
        jest.restoreAllMocks()
        jest.clearAllMocks()
    })
    test('GET / - deve redirecionar para Home page', async () => {
        const params = TestUtil.defaultHandleParams()
        params.request.method = 'GET'
        params.request.url = '/'

        await handler(...params.values())

        expect(params.response.writeHead).toBeCalledWith(
            302, {
                'Location': location.home
            }
        )
        expect(params.response.end).toHaveBeenCalled()
    })
    test(`GET /home - deve responder com o ${pages.homeHTML} via stream`, async () => {
        const params = TestUtil.defaultHandleParams()
        params.request.method = 'GET'
        params.request.url = '/home'
        const mockFileStream = TestUtil.generateReadableStream(['data'])

        jest.spyOn(
            Controller.prototype,
            Controller.prototype.getFileStream.name,).mockResolvedValue({
            stream: mockFileStream,
        })

        jest.spyOn(
            mockFileStream,
            "pipe"
        ).mockReturnValue()
        await handler(...params.values())

        expect(Controller.prototype.getFileStream).toBeCalledWith(pages.homeHTML)
        expect(mockFileStream.pipe).toBeCalledWith(params.response)
    })
    test(`GET /controller - deve responder com o ${pages.controllerHTML}via stream`, async () => {
        const params = TestUtil.defaultHandleParams()
        params.request.method = 'GET'
        params.request.url = '/controller'
        const mockFileStream = TestUtil.generateReadableStream(['data'])

        jest.spyOn(
            Controller.prototype,
            Controller.prototype.getFileStream.name,).mockResolvedValue({
            stream: mockFileStream,
        })

        jest.spyOn(
            mockFileStream,
            "pipe"
        ).mockReturnValue()
        await handler(...params.values())

        expect(Controller.prototype.getFileStream).toBeCalledWith(pages.controllerHTML)
        expect(mockFileStream.pipe).toBeCalledWith(params.response)
    })
    test(`GET /index.html - deve responder com o uma stream`, async () => {
        const params = TestUtil.defaultHandleParams()
        const fileName = '/index.html'
        params.request.method = 'GET'
        params.request.url = fileName
        const expectedType = '.html'
        const mockFileStream = TestUtil.generateReadableStream(['data'])

        jest.spyOn(
            Controller.prototype,
            Controller.prototype.getFileStream.name,
        ).mockResolvedValue({
            stream: mockFileStream,
            type: expectedType
        })

        jest.spyOn(
            mockFileStream,
            "pipe"
        ).mockReturnValue()
        await handler(...params.values())

        expect(Controller.prototype.getFileStream).toBeCalledWith(fileName)
        expect(mockFileStream.pipe).toBeCalledWith(params.response)
        expect(params.response.writeHead).toBeCalledWith(200, {
            'Content-Type': CONTENT_TYPE[expectedType]
        })
    })
    test(`GET /file.ext - deve responder com o uma stream`, async () => {
        const params = TestUtil.defaultHandleParams()
        const fileName = '/file.ext'
        params.request.method = 'GET'
        params.request.url = fileName
        const expectedType = '.ext'
        const mockFileStream = TestUtil.generateReadableStream(['data'])

        jest.spyOn(
            Controller.prototype,
            Controller.prototype.getFileStream.name,
        ).mockResolvedValue({
            stream: mockFileStream,
            type: expectedType
        })

        jest.spyOn(
            mockFileStream,
            "pipe"
        ).mockReturnValue()
        await handler(...params.values())

        expect(Controller.prototype.getFileStream).toBeCalledWith(fileName)
        expect(mockFileStream.pipe).toBeCalledWith(params.response)
        expect(params.response.writeHead).not.toHaveBeenCalled()
    })

    test(`GET /stream?id=123 - deve chamar createClientStream`, async () => {
        const params = TestUtil.defaultHandleParams()
        params.request.method = 'GET'
        params.request.url = '/stream'

        const mockFileStream = TestUtil.generateReadableStream(['data'])

        jest.spyOn(
            mockFileStream,
            "pipe"
        ).mockReturnValue()

        const onClose = jest.fn()

        jest.spyOn(
            Controller.prototype,
            Controller.prototype.createClientStream.name,
        ).mockReturnValue({
            onClose,
            mockFileStream
        })

        await handler(...params.values())
        params.request.emit('close')

        expect(params.response.writeHead).toHaveBeenCalledWith(
            200, {
                'Content-Type': 'audio/mpeg',
                'Accept-Ranges': 'bytes'
            }
        )

        expect(Controller.prototype.createClientStream).toHaveBeenCalled()
        expect(onClose).toHaveBeenCalled()
    })

    test(`POST /unknown - deve responder com o 404`, async () => {
        const params = TestUtil.defaultHandleParams()
        params.request.method = 'POST'
        params.request.url = '/unknown'

        await handler(...params.values())

        expect(params.response.writeHead).toHaveBeenCalledWith(404)
        expect(params.response.end).toHaveBeenCalled()
    })

    test(`POST /controller - deve chamar o handleCommand`, async () => {
        const params = TestUtil.defaultHandleParams()

        params.request.method = 'POST'
        params.request.url = '/controller'

        const body = {
            command: 'start'
        }

        params.request.push(JSON.stringify(body))

        const jsonResult = {
            ok: '1'
        }

        jest.spyOn(
            Controller.prototype,
            Controller.prototype.handleCommand.name
        ).mockResolvedValue(jsonResult)

        await handler(...params.values())

        expect(Controller.prototype.handleCommand).toHaveBeenCalledWith(body)
        expect(params.response.end).toHaveBeenCalledWith(JSON.stringify(jsonResult))
    })

    describe('expections', () => {
        test('um arquivo inexistente deve retornar 404', async () => {
            const params = TestUtil.defaultHandleParams()
            params.request.method = 'GET'
            params.request.url = '/index.png'

            jest.spyOn(
                Controller.prototype,
                Controller.prototype.getFileStream.name,
            ).mockRejectedValue(new Error('Error: ENOENT: no such file or directory'))

            await handler(...params.values())

            expect(params.response.writeHead).toHaveBeenCalledWith(404)
            expect(params.response.end).toHaveBeenCalled()
        })
        test('dar erro caso reponda com 500', async () => {
            const params = TestUtil.defaultHandleParams()
            params.request.method = 'GET'
            params.request.url = '/index.png'

            jest.spyOn(
                Controller.prototype,
                Controller.prototype.getFileStream.name,
            ).mockRejectedValue(new Error('Error!!'))

            await handler(...params.values())

            expect(params.response.writeHead).toHaveBeenCalledWith(500)
            expect(params.response.end).toHaveBeenCalled()
        })
    })
})
