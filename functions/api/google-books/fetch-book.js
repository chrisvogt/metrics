const got = require('got');

const fetchBook = async (apiKey, book) => {
  const {isbn, rating} = book;

  const bookEndpoint = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`;

  try {
    const {body} = await got(bookEndpoint);
    const {items: [bookData] = []} = JSON.parse(body);

    if (!bookData) {
      throw new Error(`Failed to find Google Books data for ${isbn}.`);
    }

    return {
      book: bookData,
      rating
    };
  } catch (error) {
    console.log(error);
  }
};

module.exports = fetchBook
