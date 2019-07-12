'use strict';

const getAuthor = author => {
  const {
    about,
    name: name,
    sort_by_name: sortName,
    shelf_display_name: displayName 
  } = author;

  return {
    about,
    displayName,
    name,
    sortName
  };
};

const getBook = book => {
  const {
    author,
    format,
    id: { _: goodreadsID },
    isbn,
    isbn13,
    num_pages: { _: pageCount },
    publication_year: { _: publicationYear },
    publisher,
    sort_by_title: sortTitle,
    title
  } = book;

  return {
    author: getAuthor(author),
    format,
    goodreadsID,
    isbn,
    isbn13,
    pageCount: Number(pageCount),
    publicationYear: Number(publicationYear),
    publisher,
    sortTitle,
    title
  };
};

const getUserStatus = update => {
  const {
    action_text: actionText,
    image_url: imageURL,
    link,
    object: {
      user_status: {
        book,
        created_at: { _: created },
        page: { _: page },
        percent: { _: percent },
        updated_at: { _: updated },
        user_id: { _: userID },
      }
    },
    type
  } = update;

  return {
    actionText,
    book: getBook(book),
    created,
    imageURL,
    link,
    page: Number(page),
    percent: Number(percent),
    type,
    updated: updated,
    userID
  };
};

module.exports = getUserStatus;
