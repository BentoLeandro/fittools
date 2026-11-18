import type {} from '@fastify/rate-limit' // traz o tipo de app.rateLimit()
import { Prisma } from '@prisma/client'
import type { FastifyError, FastifyInstance } from 'fastify'
import { env } from '../config/env'
import { AppError, type ErrorBody } from '../utils/errors.util'

const INTERNAL_ERROR: ErrorBody = { error: 'InternalServerError', message: 'Erro interno do servidor' }

/** Erros do Prisma carregam na mensagem os dados da consulta (inclusive o hash da senha). */
function isPrismaError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientValidationError
  )
}

/** Erros 4xx gerados pelo próprio Fastify (JSON malformado, corpo grande demais etc.). */
function clientErrorBody(error: FastifyError, statusCode: number): ErrorBody {
  if (statusCode === 413) {
    return { error: 'PayloadTooLarge', message: 'Corpo da requisição grande demais' }
  }
  if (statusCode === 415) {
    return { error: 'UnsupportedMediaType', message: 'Content-Type deve ser application/json' }
  }
  if (error.code === 'FST_ERR_CTP_EMPTY_JSON_BODY') {
    return { error: 'BadRequest', message: 'O corpo da requisição não pode estar vazio' }
  }
  return { error: 'BadRequest', message: 'JSON malformado ou requisição inválida' }
}

/**
 * Padroniza TODAS as respostas de erro no formato `{ error, message, fields? }` em português
 * (Requisitos 3.8, 9.1, 9.3, 9.4 e 9.9): nunca devolve stack, SQL ou texto de biblioteca ao cliente.
 */
export function registerErrorHandlers(app: FastifyInstance) {
  // O limite global do plugin só vale para rotas que existem: o 404 precisa do próprio limitador
  // (o mesmo contador público por IP), senão varreduras de URLs inexistentes passariam livres.
  // Exige o plugin de rate limit já registrado.
  app.setNotFoundHandler({ preHandler: app.rateLimit() }, (_request, reply) => {
    return reply.status(404).send({ error: 'NotFound', message: 'Recurso não encontrado' })
  })

  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(error.toBody())
    }

    const statusCode = (error as FastifyError).statusCode
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send(clientErrorBody(error as FastifyError, statusCode))
    }

    // Erro inesperado: o detalhe fica só no log do servidor
    if (isPrismaError(error)) {
      const code = (error as { code?: string }).code
      // Em produção loga só o tipo e o código; em desenvolvimento, o erro inteiro
      if (env.NODE_ENV === 'development') {
        request.log.error({ err: error }, 'Erro do Prisma')
      } else {
        request.log.error({ prismaError: error.name, prismaCode: code }, 'Erro do Prisma')
      }
    } else {
      request.log.error({ err: error }, 'Erro inesperado')
    }
    return reply.status(500).send(INTERNAL_ERROR)
  })
}