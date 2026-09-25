FROM postgres:16-alpine

RUN apk add --no-cache --virtual .build-deps \
        git \
        build-base \
    && cd /tmp \
    && git clone --depth 1 --branch v0.7.4 https://github.com/pgvector/pgvector.git \
    && cd pgvector \
    && make OPTFLAGS="" with_llvm=no \
    && make with_llvm=no install \
    && cd / \
    && rm -rf /tmp/pgvector \
    && apk del .build-deps
