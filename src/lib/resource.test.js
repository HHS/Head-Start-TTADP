/* eslint-disable no-useless-escape */
import axios from 'axios'
import { auditLogger } from '../logger'
import { getResourceMetaDataJob, overrideStatusCodeOnAuthRequired } from './resource'
import db, { Resource } from '../models'

jest.mock('../logger')
jest.mock('bull')

const urlReturn = `
<!DOCTYPE html>
<html lang="en" dir="ltr" prefix="og: https://ogp.me/ns#" class="no-js">
<head>
<meta charset="utf-8" />
<meta name="language" content="en" />
<meta name="topic" content="Mental Health" />
<meta name="resource-type" content="Article" />
<meta name="national-centers" content="Health, Behavioral Health, and Safety" />
<meta name="node-id" content="7858" />
<meta name="exclude-from-dynamic-view" content="False" />
<link rel="canonical" href="https://headstart.gov/" />
<link rel="image_src" href="https://headstart.gov/themes/gesso/images/site-logo.png" />
<title>Head Start | Head Start</title>
<body>
test
</body>
</html>
`

const urlMissingTitle = `
<!DOCTYPE html>
<html lang="en" dir="ltr" prefix="og: https://ogp.me/ns#" class="no-js">
<body>
test
</body>
</html>
`

const metadata = {
  created: [{ value: '2020-04-21T15:20:23+00:00' }],
  changed: [{ value: '2023-05-26T18:57:15+00:00' }],
  title: [{ value: 'Head Start Heals Campaign' }],
  field_taxonomy_national_centers: [{ target_type: 'taxonomy_term' }],
  field_taxonomy_topic: [{ target_type: 'taxonomy_term' }],
  langcode: [{ value: 'en' }],
  field_context: [{ value: '<p><img alt="Two pairs of hands holding a heart.</p>' }],
}

const mockAxios = jest.spyOn(axios, 'get').mockImplementation(() => Promise.resolve())
const mockAxiosHead = jest.spyOn(axios, 'head').mockImplementation(() => Promise.resolve())
const axiosCleanMimeResponse = {
  status: 200,
  headers: { 'content-type': 'text/html; charset=utf-8' },
}
const axiosCleanResponse = { ...axiosCleanMimeResponse, data: urlReturn }
const axiosNoTitleResponse = {
  status: 404,
  data: urlMissingTitle,
  headers: { 'content-type': 'text/html; charset=utf-8' },
}
const axiosResourceNotFound = { status: 404, data: 'Not Found' }
const axiosError = new Error()
axiosError.response = { status: 500, data: 'Error' }
const mockUpdate = jest.spyOn(Resource, 'update').mockImplementation(() => Promise.resolve())

describe('resource worker tests', () => {
  let resource
  afterAll(async () => {
    if (resource?.id) {
      await Resource.destroy({ where: { id: resource.id } })
    }
    await db.sequelize.close()
  })
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('non-headstart clean resource title get', async () => {
    // Mock TITLE get.
    mockAxios.mockImplementationOnce(() => Promise.resolve(axiosCleanResponse))
    mockAxiosHead.mockImplementationOnce(() => Promise.resolve(axiosCleanMimeResponse))
    mockUpdate.mockImplementationOnce(() => Promise.resolve([1]))

    // Call the function.
    const got = await getResourceMetaDataJob({
      data: {
        resourceId: 100000,
        resourceUrl: 'https://test.gov/mental-health/article/head-start-heals-campaign',
      },
    })

    // Check the response.
    expect(got.status).toBe(200)

    // Check the data.
    expect(got.data).toStrictEqual({
      url: 'https://test.gov/mental-health/article/head-start-heals-campaign',
    })

    // Check the axios call.
    expect(mockAxios).toBeCalled()

    // expect mockUpdate to have only been called once.
    expect(mockUpdate).toBeCalledTimes(2)

    // Check title update.
    expect(mockUpdate).toHaveBeenNthCalledWith(
      1,
      {
        lastStatusCode: 200,
        mimeType: axiosCleanResponse.headers['content-type'],
      },
      {
        where: { url: 'https://test.gov/mental-health/article/head-start-heals-campaign' },
        individualHooks: true,
      }
    )

    expect(mockUpdate).toHaveBeenLastCalledWith(
      {
        title: 'Head Start | Head Start',
        lastStatusCode: 200,
        mimeType: axiosCleanResponse.headers['content-type'],
        metadata: {
          language: 'en',
          topic: 'Mental Health',
          'resource-type': 'Article',
          'national-centers': 'Health, Behavioral Health, and Safety',
          'node-id': '7858',
          'exclude-from-dynamic-view': 'False',
          title: 'Head Start | Head Start',
        },
        metadataUpdatedAt: expect.anything(),
      },
      {
        where: { url: 'https://test.gov/mental-health/article/head-start-heals-campaign' },
        individualHooks: true,
      }
    )
  })

  it('non-headstart error on resource title get', async () => {
    // Mock TITLE get.
    const axiosHtmlScrapeError = new Error()
    axiosHtmlScrapeError.response = {
      status: 500,
      data: 'Error',
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }
    mockAxios.mockImplementationOnce(() => Promise.reject(axiosHtmlScrapeError))
    mockAxiosHead.mockImplementationOnce(() => Promise.resolve(axiosCleanMimeResponse))
    mockUpdate.mockImplementationOnce(() => Promise.resolve([1]))

    // Call the function.
    const got = await getResourceMetaDataJob({
      data: {
        resourceId: 100000,
        resourceUrl: 'https://test.gov/mental-health/article/head-start-heals-campaign',
      },
    })

    // Check the response.
    expect(got.status).toBe(500)
  })

  it('tests a clean resource metadata get', async () => {
    // Metadata.
    mockAxios.mockImplementationOnce(() =>
      Promise.resolve({
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: metadata,
      })
    )
    mockAxiosHead.mockImplementationOnce(() => Promise.resolve(axiosCleanMimeResponse))
    mockUpdate.mockImplementationOnce(() => Promise.resolve([1]))

    const got = await getResourceMetaDataJob({ data: { resourceUrl: 'http://www.headstart.gov' } })

    expect(got.status).toBe(200)
    expect(got.data).toStrictEqual({ url: 'http://www.headstart.gov' })

    expect(mockUpdate).toBeCalledTimes(2)

    // Check the update call.
    expect(mockUpdate).toHaveBeenLastCalledWith(
      {
        metadata: {
          changed: [
            {
              value: '2023-05-26T18:57:15+00:00',
            },
          ],
          created: [
            {
              value: '2020-04-21T15:20:23+00:00',
            },
          ],
          field_context: [
            {
              value: '<p><img alt="Two pairs of hands holding a heart.</p>',
            },
          ],
          field_taxonomy_national_centers: [
            {
              target_type: 'taxonomy_term',
            },
          ],
          field_taxonomy_topic: [
            {
              target_type: 'taxonomy_term',
            },
          ],
          langcode: [
            {
              value: 'en',
            },
          ],
          title: [
            {
              value: 'Head Start Heals Campaign',
            },
          ],
        },
        metadataUpdatedAt: expect.anything(),
        title: 'Head Start Heals Campaign',
        lastStatusCode: 200,
      },
      {
        individualHooks: true,
        where: {
          url: 'http://www.headstart.gov',
        },
      }
    )
  })

  it('tests a clean resource metadata get when url is eclkc.ohs.acf.hhs.gov', async () => {
    // Metadata.
    mockAxios.mockImplementationOnce(() =>
      Promise.resolve({
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: metadata,
      })
    )
    mockAxiosHead.mockImplementationOnce(() => Promise.resolve(axiosCleanMimeResponse))
    mockUpdate.mockImplementationOnce(() => Promise.resolve([1]))

    const got = await getResourceMetaDataJob({
      data: { resourceUrl: 'http://www.eclkc.ohs.acf.hhs.gov' },
    })

    expect(got.status).toBe(200)
    expect(got.data).toStrictEqual({ url: 'http://www.eclkc.ohs.acf.hhs.gov' })

    expect(mockUpdate).toBeCalledTimes(2)

    // Check the update call.
    expect(mockUpdate).toHaveBeenLastCalledWith(
      {
        metadata: {
          changed: [
            {
              value: '2023-05-26T18:57:15+00:00',
            },
          ],
          created: [
            {
              value: '2020-04-21T15:20:23+00:00',
            },
          ],
          field_context: [
            {
              value: '<p><img alt="Two pairs of hands holding a heart.</p>',
            },
          ],
          field_taxonomy_national_centers: [
            {
              target_type: 'taxonomy_term',
            },
          ],
          field_taxonomy_topic: [
            {
              target_type: 'taxonomy_term',
            },
          ],
          langcode: [
            {
              value: 'en',
            },
          ],
          title: [
            {
              value: 'Head Start Heals Campaign',
            },
          ],
        },
        metadataUpdatedAt: expect.anything(),
        title: 'Head Start Heals Campaign',
        lastStatusCode: 200,
      },
      {
        individualHooks: true,
        where: {
          url: 'http://www.eclkc.ohs.acf.hhs.gov',
        },
      }
    )
  })

  it('tests a clean resource metadata get with a url that has params', async () => {
    // Metadata.
    mockAxios.mockImplementationOnce(() =>
      Promise.resolve({
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: metadata,
      })
    )
    mockAxiosHead.mockImplementationOnce(() => Promise.resolve(axiosCleanMimeResponse))
    mockUpdate.mockImplementationOnce(() => Promise.resolve([1]))

    const got = await getResourceMetaDataJob({
      data: { resourceUrl: 'http://www.headstart.gov/activity-reports?region.in[]=1' },
    })
    expect(got.status).toBe(200)
    expect(got.data).toStrictEqual({
      url: 'http://www.headstart.gov/activity-reports?region.in[]=1',
    })

    expect(mockUpdate).toBeCalledTimes(2)

    expect(mockAxios).toBeCalledWith('http://www.headstart.gov/activity-reports?region.in[]=1&_format=json', {
      maxRedirects: 25,
      responseEncoding: 'utf8',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      },
    })

    // Check the update call.
    expect(mockUpdate).toHaveBeenLastCalledWith(
      {
        metadata: {
          changed: [
            {
              value: '2023-05-26T18:57:15+00:00',
            },
          ],
          created: [
            {
              value: '2020-04-21T15:20:23+00:00',
            },
          ],
          field_context: [
            {
              value: '<p><img alt="Two pairs of hands holding a heart.</p>',
            },
          ],
          field_taxonomy_national_centers: [
            {
              target_type: 'taxonomy_term',
            },
          ],
          field_taxonomy_topic: [
            {
              target_type: 'taxonomy_term',
            },
          ],
          langcode: [
            {
              value: 'en',
            },
          ],
          title: [
            {
              value: 'Head Start Heals Campaign',
            },
          ],
        },
        metadataUpdatedAt: expect.anything(),
        title: 'Head Start Heals Campaign',
        lastStatusCode: 200,
      },
      {
        individualHooks: true,
        where: {
          url: 'http://www.headstart.gov/activity-reports?region.in[]=1',
        },
      }
    )
  })

  it('tests a clean resource metadata get with a url that has a pound sign', async () => {
    // Metadata.
    mockAxios.mockImplementationOnce(() =>
      Promise.resolve({
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: metadata,
      })
    )
    mockAxiosHead.mockImplementationOnce(() => Promise.resolve(axiosCleanMimeResponse))
    mockUpdate.mockImplementationOnce(() => Promise.resolve([1]))

    const got = await getResourceMetaDataJob({
      data: { resourceUrl: 'http://www.headstart.gov/section#2' },
    })
    expect(got.status).toBe(200)
    expect(got.data).toStrictEqual({ url: 'http://www.headstart.gov/section#2' })

    expect(mockUpdate).toBeCalledTimes(2)

    // Expect axios get to have been called with the correct url.
    expect(mockAxios).toBeCalledWith('http://www.headstart.gov/section?_format=json', {
      maxRedirects: 25,
      responseEncoding: 'utf8',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      },
    })

    // Check the update call.
    expect(mockUpdate).toHaveBeenLastCalledWith(
      {
        metadata: {
          changed: [
            {
              value: '2023-05-26T18:57:15+00:00',
            },
          ],
          created: [
            {
              value: '2020-04-21T15:20:23+00:00',
            },
          ],
          field_context: [
            {
              value: '<p><img alt="Two pairs of hands holding a heart.</p>',
            },
          ],
          field_taxonomy_national_centers: [
            {
              target_type: 'taxonomy_term',
            },
          ],
          field_taxonomy_topic: [
            {
              target_type: 'taxonomy_term',
            },
          ],
          langcode: [
            {
              value: 'en',
            },
          ],
          title: [
            {
              value: 'Head Start Heals Campaign',
            },
          ],
        },
        metadataUpdatedAt: expect.anything(),
        title: 'Head Start Heals Campaign',
        lastStatusCode: 200,
      },
      {
        individualHooks: true,
        where: {
          url: 'http://www.headstart.gov/section#2',
        },
      }
    )
  })

  it('tests error with a response from get metadata', async () => {
    const axiosMetadataErrorResponse = new Error()
    axiosMetadataErrorResponse.response = {
      status: 500,
      data: 'Error',
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }
    mockAxios
      .mockImplementationOnce(() => Promise.reject(axiosMetadataErrorResponse))
      .mockImplementationOnce(() => Promise.resolve(axiosMetadataErrorResponse))

    mockAxiosHead.mockImplementationOnce(() => Promise.resolve(axiosCleanMimeResponse))
    mockUpdate.mockImplementationOnce(() => Promise.resolve([1]))

    const got = await getResourceMetaDataJob({ data: { resourceUrl: 'http://www.headstart.gov' } })
    expect(got.status).toBe(500)
    expect(got.data).toStrictEqual({ url: 'http://www.headstart.gov' })

    expect(mockUpdate).toBeCalledTimes(2)
  })

  it('tests error without a response from get metadata', async () => {
    const axiosMetadataErrorResponse = new Error()
    axiosMetadataErrorResponse.response = { data: 'Error' }
    mockAxios.mockImplementationOnce(() => Promise.reject(axiosMetadataErrorResponse))

    mockAxiosHead.mockImplementationOnce(() => Promise.resolve(axiosCleanMimeResponse))
    mockUpdate.mockImplementationOnce(() => Promise.resolve([1]))

    const got = await getResourceMetaDataJob({ data: { resourceUrl: 'http://www.headstart.gov' } })

    // Verify auditlogger.error was called with the message we expect.
    expect(auditLogger.error).toBeCalledTimes(3)
  })

  it('headstart resource we get metadata but no title', async () => {
    mockAxiosHead.mockImplementationOnce(() => Promise.resolve(axiosCleanMimeResponse))
    mockAxios.mockImplementationOnce(() =>
      Promise.resolve({
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: { ...metadata, title: null },
      })
    )
    mockAxios.mockImplementationOnce(() =>
      Promise.resolve({
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        data: urlMissingTitle,
      })
    )
    mockUpdate.mockImplementationOnce(() => Promise.resolve([1]))

    // Scrape.
    mockAxios.mockImplementationOnce(() => Promise.resolve(axiosCleanResponse))
    mockUpdate.mockImplementationOnce(() => Promise.resolve([1]))

    const got = await getResourceMetaDataJob({ data: { resourceUrl: 'http://www.headstart.gov' } })
    expect(got.status).toBe(200)
    expect(got.data).toStrictEqual({ url: 'http://www.headstart.gov' })

    expect(mockUpdate).toBeCalledTimes(2)

    // Check title scrape update..
    expect(mockUpdate).toBeCalledWith(
      {
        lastStatusCode: 200,
        mimeType: 'text/html; charset=utf-8',
      },
      {
        individualHooks: true,
        where: { url: 'http://www.headstart.gov' },
      }
    )

    // Check the update call.
    expect(mockUpdate).toBeCalledWith(
      {
        metadata: {
          changed: [
            {
              value: '2023-05-26T18:57:15+00:00',
            },
          ],
          created: [
            {
              value: '2020-04-21T15:20:23+00:00',
            },
          ],
          field_context: [
            {
              value: '<p><img alt="Two pairs of hands holding a heart.</p>',
            },
          ],
          field_taxonomy_national_centers: [
            {
              target_type: 'taxonomy_term',
            },
          ],
          field_taxonomy_topic: [
            {
              target_type: 'taxonomy_term',
            },
          ],
          langcode: [
            {
              value: 'en',
            },
          ],
          title: null,
        },
        metadataUpdatedAt: expect.anything(),
        title: 'null',
        lastStatusCode: 200,
      },
      {
        individualHooks: true,
        where: {
          url: 'http://www.headstart.gov',
        },
      }
    )
  })

  it('non-headstart resource missing title', async () => {
    mockAxiosHead.mockImplementationOnce(() => Promise.resolve({ headers: { 'content-type': 'text/html; charset=utf-8' }, status: 404 }))
    mockAxios.mockImplementationOnce(() => Promise.resolve(axiosNoTitleResponse))
    const got = await getResourceMetaDataJob({ data: { resourceUrl: 'http://www.test.gov' } })
    expect(got.status).toBe(404)
    expect(got.data).toStrictEqual({ url: 'http://www.test.gov' })
    expect(mockAxiosHead).toBeCalled()
    expect(mockAxios).not.toBeCalled()
    expect(mockUpdate).toBeCalled()
  })

  it('non-headstart resource url not found', async () => {
    mockAxiosHead.mockImplementationOnce(() => Promise.resolve({ headers: { 'content-type': 'text/html; charset=utf-8' }, status: 404 }))
    mockAxios.mockImplementationOnce(() => Promise.resolve(axiosResourceNotFound))
    const got = await getResourceMetaDataJob({ data: { resourceUrl: 'http://www.test.gov' } })
    expect(got.status).toBe(404)
    expect(got.data).toStrictEqual({ url: 'http://www.test.gov' })
    expect(mockAxiosHead).toBeCalled()
    expect(mockAxios).not.toBeCalled()
    expect(mockUpdate).toBeCalled()
  })

  it('headstart resource url not found', async () => {
    mockAxiosHead.mockImplementationOnce(() => Promise.resolve({ headers: { 'content-type': 'text/html; charset=utf-8' }, status: 404 }))
    mockAxios.mockImplementationOnce(() => Promise.resolve(axiosResourceNotFound))
    const got = await getResourceMetaDataJob({ data: { resourceUrl: 'http://www.headstart.gov' } })
    expect(got.status).toBe(404)
    expect(got.data).toStrictEqual({ url: 'http://www.headstart.gov' })
    expect(mockAxiosHead).toBeCalled()
    expect(mockAxios).not.toBeCalled()
    expect(mockUpdate).toBeCalled()
  })

  it('get mime type handles error response correctly', async () => {
    // Mock auditLogger.error.
    const mockAuditLogger = jest.spyOn(auditLogger, 'error')
    // Mock error on axios head error.
    const axiosMimeError = new Error()
    axiosMimeError.response = {
      status: 500,
      data: 'Error',
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }
    mockAxiosHead.mockImplementationOnce(() => Promise.reject(axiosMimeError))

    // Call the function.
    const got = await getResourceMetaDataJob({ data: { resourceUrl: 'http://www.test.gov' } })
    // Check the response.
    expect(got.status).toBe(500)

    // Expect auditLogger.error to have been called with the correct message.
    expect(mockAuditLogger).toBeCalledTimes(2)

    // Check the axios call.
    expect(mockAxiosHead).toBeCalled()

    // Check the update call.
    expect(mockUpdate).toBeCalledTimes(1)

    // Check the update call.
    expect(mockUpdate).toBeCalledWith(
      {
        lastStatusCode: 500,
        mimeType: 'text/html; charset=utf-8',
      },
      {
        individualHooks: true,
        where: {
          url: 'http://www.test.gov',
        },
      }
    )
  })

  it('get mime type handles no error response correctly', async () => {
    // Mock error on axios head error.
    const axiosMimeError = new Error()
    axiosMimeError.response = { data: 'Error' }
    mockAxiosHead.mockImplementationOnce(() => Promise.reject(axiosMimeError))

    // Call the function.
    const got = await getResourceMetaDataJob({ data: { resourceUrl: 'http://www.test.gov' } })

    // Check the response.
    expect(got).toEqual({
      status: 500,
      data: { url: 'http://www.test.gov' },
    })
  })
})

describe('overrideStatusCodeOnAuthRequired', () => {
  const httpCodes = { OK: 200, UNAUTHORIZED: 401, SERVICE_UNAVAILABLE: 503 }

  it('returns UNAUTHORIZED if status code is OK and authentication is required', () => {
    const statusCode = httpCodes.OK
    const list = ['auth']
    const data = 'some data with auth requirement'
    const result = overrideStatusCodeOnAuthRequired(statusCode, list, data)
    expect(result).toBe(httpCodes.UNAUTHORIZED)
  })

  it('returns OK if status code is OK and authentication is not required', () => {
    const statusCode = httpCodes.OK
    const list = ['no-auth']
    const data = 'data without auth requirement'
    const result = overrideStatusCodeOnAuthRequired(statusCode, list, data)
    expect(result).toBe(httpCodes.OK)
  })
})
