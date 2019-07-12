'use strict';

const getActor = actor => {
  const {
    imageURL,
    link,
    name
  } = actor;

  return {
    imageURL,
    link,
    name
  }
};

const getAuthor = author => {
  const {
    average_rating: averageRating,
    id: goodreadsID,
    image_url: {
      _: imageURL = '',
      nophoto: hasImageURL = false
    } = {},
    link,
    small_image_url: {
      _: smallImageURL = '',
      nophoto: hasSmallImageURL = false
    } = {},
    name,
    ratingsCount: ratingsCount,
    text_reviews_count: textReviewCount
  } = author;

  return {
    averageRating,
    goodreadsID,
    imageURL,
    hasImageURL,
    smallImageURL,
    hasSmallImageURL,
    ratingsCount,
    textReviewCount
  };
};

const getBook = book => {
  console.log(book);
  const {
    authors: {
      author
    } = {},
    id: goodreadsID,
    link,
    title
  } = book;

  return {
    author: author && getAuthor(author),
    goodreadsID,
    link,
    title
  };
};

const getReview = update => {
  const {
    action: {
      rating
    },
    actor,
    actionText,
    link,
    object: {
      book
    },
    type,
    updatedAt: updated
  } = update;

  return {
    actionText,
    actor: getActor(actor),
    book: getBook(book),
    link,
    rating: Number(rating),
    type,
    updated
  };
};

module.exports = getReview;
