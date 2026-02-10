# this function creates a search tool that finds relevant content from our PDFs
def get_retriever(vectorstore):
    # using MMR (Maximal Marginal Relevance) search which gives us
    # results that are both relevant AND diverse (not all saying the same thing)
    return vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": 5,           # return top 5 most relevant chunks
            "fetch_k": 15,    # look at 15 candidates before picking the best 5
            "lambda_mult": 0.9  # 0.9 means we care more about relevance than diversity
        }
    )
