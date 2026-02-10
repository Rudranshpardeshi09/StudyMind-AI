# this splits big PDF text into smaller pieces that the AI can understand
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import settings

# takes in loaded PDF documents and splits them into smaller chunks
def chunk_documents(documents):
    # the splitter breaks text at natural boundaries like paragraphs, sentences, etc
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,      # max size of each chunk (default 1000 chars)
        chunk_overlap=settings.CHUNK_OVERLAP, # overlap between chunks so context isnt lost
        separators=["\n\n", "\n", ".", " "]  # try splitting at paragraphs first, then lines, then sentences
    )
    # returns a list of smaller text chunks ready for embedding
    return splitter.split_documents(documents)
